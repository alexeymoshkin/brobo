'use strict';

var apiUrl = 'http://ap.yarlan.ru/site/db/saver.php',
    urlTbRegx = "*://buyertrade.taobao.com/trade/itemlist/list_bought_items.htm*",
    urlYrlRegx = "*://ap.yarlan.ru/order_item.php*",
    Port;

function takeSendDataApi( msg, action ) {
  var xhr = new XMLHttpRequest(),
      d = $.Deferred(),
      trackParam = msg.track ? `&track=${msg.track}` : '',
      deliveryParam = msg.delivery ? `&delivery=${task.delivery}` : '',
      task = msg.task,
      sendUrl =  `${apiUrl}?action=${action}&manager_login=${task.managerLogin}&order_id=${task.taobaoOrderId}&store_id=${task.storeId}${trackParam}${deliveryParam}`;

  xhr.open( 'POST', sendUrl, true );
  xhr.setRequestHeader( "Accept", "text/json" );
  xhr.setRequestHeader( "X-Requested-With", "XMLHttpRequest" );

  xhr.send( JSON.stringify( msg.orderData ||
                            msg.orderItemsData ||
                            msg.trackingData ));

  xhr.onreadystatechange = function() {
    if ( this.readyState != 4 ) return;

    if ( this.status != 200 ) {
      d.reject();
      return d;
    }
    d.resolve();
  }
  return d;
}

function callPerformTask( task ) {
  switch ( task.taskName ) {
  case 'getOrderInfo':
    maybeOpenTaobaoTab().done( function(){
      // if tab open now

    }).fail( function() {
      // if no need to open tab - its already exist
      chrome.tabs.query( {url: urlTbRegx}, function( tabs ) {
        chrome.tabs.sendMessage( tabs[0].id, task );
      });
    });

    break;
  }
}

function checkManager( login ) {
  var d = $.Deferred();

  chrome.cookies.get( { url: 'https://www.taobao.com', name: '_nk_' }, function( obj ){
    if ( obj === null || obj.value !== login ) {
      chrome.tabs.query( {url: urlYrlRegx}, function( tabs ) {
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
    chrome.tabs.query( {url: urlYrlRegx}, function( tabs ) {
      chrome.tabs.sendMessage( tabs[0].id, msg );
    });
    return;
  }

  $.when(
    takeSendDataApi( msg.task, 'sendOrderData' ),
    takeSendDataApi( msg.task, 'sendOrderItemsData' )

  ).always( function() {
    msg = cleanMsg( msg );

  }).done( function() {
    chrome.tabs.query( {url: urlYrlRegx}, function( tabs ) {
      chrome.tabs.sendMessage( tabs[0].id, msg );
    });

  }).fail( function() {
    msg.error = 'Не удалось отправить данные на сервер';

    chrome.tabs.query( {url: urlYrlRegx}, function( tabs ) {
      chrome.tabs.sendMessage( tabs[0].id, msg );
    });
  });
}

function cleanMsg( msg ){
  delete msg.orderData;
  delete msg.orderItemsData;
  delete msg.from;
  return msg;
}

function handleMsgTask( msg ){
  switch( msg.task.taskName ) {
  case 'getOrderInfo':
    d1 = takeSendDataApi( msg.task, 'sendOrderData' ),
    d2 = 12
    return , takeSendDataApi( msg.task, 'sendOrderItemsData' )

    break;

  case 'getTrack':
    return
    break;
  }
}


chrome.runtime.onConnect.addListener( function( port ){
  Port = port;

  port.onMessage.addListener( function ( msg ){
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
