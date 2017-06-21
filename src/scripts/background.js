'use strict';

var apiUrl = 'http://ap.yarlan.ru/site/db/saver.php',
    urlTbRegx = "*://buyertrade.taobao.com/trade/itemlist/list_bought_items.htm*",
    urlYrlRegx = "*://ap.yarlan.ru/*",
    Port;

(function() {
  // reload all tabs work with
  chrome.tabs.query( {url: [urlYrlRegx, urlTbRegx]}, function( tabs ) {
    $( tabs ).each( ( i, tab ) => {
      chrome.tabs.reload( tab.id );
    });
  });
})()

function cleanMsg( msg ){
  delete msg.orderData;
  delete msg.orderItemsData;
  delete msg.from;
  return msg;
}

function sendMsgYarlan( msg ) {
  chrome.tabs.query( {url: urlYrlRegx}, function( tabs ) {
    chrome.tabs.sendMessage( tabs[0].id, msg );
  });
}

function takeSendDataApi( task, data, action ) {
  var xhr = new XMLHttpRequest(),
      d = $.Deferred(),
      statusParam = task.orderStatus ? `&order_status=${task.orderStatus}` : '',
      trackParam = task.track ? `&track=${task.track}` : '',
      deliveryParam = task.delivery ? `&delivery=${task.delivery}` : '',
      payDateParam = task.orderPayDate ? `&order_pay_date=${task.orderPayDate}` : '',
      sendUrl = `${apiUrl}?action=${action}&
manager_login=${task.managerLogin}&
order_id=${task.taobaoOrderId}&
store_id=${task.storeId}
${trackParam}
${deliveryParam}
${statusParam}
${payDateParam}`;

  xhr.open( 'POST', sendUrl, true );
  xhr.setRequestHeader( "Accept", "text/json" );
  xhr.setRequestHeader( "X-Requested-With", "XMLHttpRequest" );
  xhr.send( JSON.stringify( data ) );

  xhr.onreadystatechange = function() {
    if ( this.readyState != 4 ) return;

    if ( this.status != 200 ) {
      d.reject();
      return d;
    }

    maybeHandleSaverErr( this.responseText );
    d.resolve();
  }
  return d;
}

function maybeHandleSaverErr( text ) {
  if ( !text ) return;

  let res = JSON.parse( text );
  if ( res.result !== 0 ) return;

  sendMsgYarlan({
    error: 'fromSaver',
    text: res.error
  });
}

function checkManager( login ) {
  var d = $.Deferred();

  chrome.cookies.get( { url: 'https://www.taobao.com', name: '_nk_' }, obj => {
    console.log( 'OBJECT', obj );
    if ( obj === null || obj.value !== login ) {
      chrome.tabs.query( {url: urlYrlRegx}, tabs => {

        chrome.tabs.create( {url: 'https://login.taobao.com/', active: false} );

        chrome.tabs.sendMessage( tabs[0].id, {
          error: 'wrongManager',
          taskManager: login,
          taobaoManager: obj ? obj.value : null
        });

        d.reject();
      });
    } else {
      d.resolve();
    }
  });

  return d;
}

function maybeOpenTaobaoTab( msg ) {
  var d = $.Deferred(),
      url = "https://buyertrade.taobao.com/trade/itemlist/list_bought_items.htm";

  chrome.tabs.query( {url: urlTbRegx}, function( tabs ){
    if ( !tabs.length ) {
      chrome.tabs.create( {url: url, active: false} );
      d.resolve();
    }
    d.reject();
  });

  return d;
}

function handleYarlanMsg( msg ) {
  $.when(
    checkManager( msg.managerLogin )
  ).done( function() {
    maybeOpenTaobaoTab( msg );

    delete msg.from;

    let tabLoad = setInterval( function() {
      chrome.tabs.query( {url: urlTbRegx}, function( tabs ) {
        if ( tabs[0].status === 'complete' ) {
          clearInterval( tabLoad );
          chrome.tabs.sendMessage( tabs[0].id, msg );
        }
      });
    }, 100 );
  });
}

function handleTaobaoMsg( msg ) {
  if ( msg.error ) {
    msg = cleanMsg( msg );
    sendMsgYarlan( msg );
    return;
  }

  $.when(
    handleMsgTask( msg )

  ).always( () => {
    msg = cleanMsg( msg );

  }).fail( () => {
    msg.error = 'Не удалось отправить данные на сервер';
    sendMsgYarlan( msg );

  }).then( () => {
    sendMsgYarlan( msg );
  });
}

function handleMsgTask( msg ){
  switch( msg.task.taskName ) {
  case 'getOrderInfo':
    let d1 = takeSendDataApi( msg.task, msg.orderData, 'sendOrderData' ),
        d2 = takeSendDataApi( msg.task, msg.orderItemsData, 'sendOrderItemsData' );
    return d1, d2;

  case 'getTrack':
    if ( !msg.task.track ) {
      msg.error = `Заказ ${msg.task.taobaoOrderId} еще не отпарвлен - трека нет`;
      break;
    }

  case 'getAllTracks':
    if ( !msg.task.track ) break;

  case 'getTrack', 'getAllTracks':
    return takeSendDataApi( msg.task, '', 'sendOrderTrack' );

  case 'getAllStatuses':
    return takeSendDataApi( msg.task, '', 'sendOrderStatus' );

  }
}


chrome.runtime.onConnect.addListener( port => {
  Port = port;

  port.onMessage.addListener( msg => {
    switch( msg.from ) {
    case 'yarlan':
      handleYarlanMsg( msg );
      break;

    case 'taobao':
      handleTaobaoMsg( msg );
      break;
    }
  });
});
