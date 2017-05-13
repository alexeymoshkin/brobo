'use strict';

var apiUrl = 'http://ap.yarlan.ru/site/db/saver.php',
    port,
    formDataStr = 'buyerNick&dateBegin=0&dateEnd=0&lastStartRow&logisticsService&options=0&orderStatus&queryBizType&queryOrder=desc&rateStatus&refund&sellerNick&pageNum=1&pageSize=15';

$( document ).ready( function() {
  port = chrome.runtime.connect( {name: 'taobao'} );

  chrome.runtime.onMessage.addListener( function( msg ) {
    switch ( msg.taskName ){
    case 'getOrderInfo':
      getSendOrderData( msg );
      break;

    case 'getTrack':
      getSendTrack( msg );
      break;

    case 'getAllTracks':
      $( msg.ordersIds ).each( function() {
        let task = {
          storeId: this.store_id,
          managerLogin: msg.managerLogin,
          taskName: 'getTrack',
          taobaoOrderId: this.taobao_order_id
        };

        getSendTrack( task );
      });

      break;
    }
  });
  // testRequest();
});

function getXMLHttp(){
  try {
    return XPCNativeWrapper( new window.wrappedJSObject.XMLHttpRequest() );
  }
  catch( evt ){
    return new XMLHttpRequest();
  }
}

function getSendOrderData( task ) {
  let orderUrl = "https://buyertrade.taobao.com/trade/itemlist/asyncBought.htm?action=itemlist/BoughtQueryAction&event_submit_do_query=1&_input_charset=utf8",
      xhr = getXMLHttp(),
      data = formDataStr + '&itemTitle=' + task.taobaoOrderId + '&auctionTitle=' + task.taobaoOrderId + '&prePageNo=1';

  xhr.open( 'POST', orderUrl, true );

  xhr.setRequestHeader( 'Accept', 'application/json, text/javascript, */*; q=0.01' );
  xhr.setRequestHeader( 'Content-type', 'application/x-www-form-urlencoded; charset=UTF-8' );
  xhr.setRequestHeader( 'X-requested-with', 'XMLHttpRequest' );

  xhr.send( data ); // data

  xhr.onreadystatechange = function() {
    if ( this.readyState != 4 ) return;

    if ( this.status != 200 ) {
      port.postMessage({
        task: task,
        from: 'taobao',
        error: 'Не удалось получить данные'
      });
    } else {
      maybeSendTrack( this.responseText, task );
      sendMessageToBg( this.responseText, task );
    }
  };
}

function maybeSendTrack( data, task ) {
  let orderOperations = JSON.parse( data ).mainOrders[0].statusInfo.operations;

  $( orderOperations ).each( function() {
    if ( this.id == 'viewLogistic' ) {
      getSendTrack( task );
    }
  });
}

function getSendTrack( task ) {
  let trackUrl = 'https://buyertrade.taobao.com/trade/json/transit_step.do?bizOrderId=' + task.taobaoOrderId,
      trackTask = {
        taobaoOrderId: task.taobaoOrderId,
        storeId: task.storeId,
        managerLogin: task.managerLogin,
        taskName: 'getTrack'
      },
      trackTaskMsg = {
        task: trackTask,
        from: 'taobao'
      };

  $.ajax({
    url: trackUrl,
    success: data => {
      trackTaskMsg.task.track = data.expressId;
      port.postMessage( trackTaskMsg );
    },
    error: err => {
      trackTaskMsg.error = err;
      port.postMessage( trackTaskMsg );
    }
  });
}

function getDelivery( data ) {
  let dataObj = JSON.parse( data ),
      delivery = dataObj.mainOrders[0].payInfo.postFees[0].value.replace("￥", '');

  return delivery;
}

function isItemsNotExist( jsonStr ) {
  if( jsonStr.length === 0 ) return true;
  var json = JSON.parse( jsonStr );

  if ( json.mainOrders.length ) return false;
  return true;
}

function sendMessageToBg( response, task ) {
  let orderTask = {
    taobaoOrderId: task.taobaoOrderId,
    storeId: task.storeId,
    managerLogin: task.managerLogin,
    taskName: 'getOrderInfo'
  },
      orderTaskMsg = {
        task: orderTask,
        from: 'taobao'
      };

  if ( isItemsNotExist( response ) ) {
    orderTaskMsg.error = 'Номер заказа не соответствует менеджеру Taobao';
  } else {
    orderTaskMsg.orderData = JSON.parse( response );
    orderTaskMsg.orderItemsData = createOrderItemsObj( response );
    orderTaskMsg.task.delivery = getDelivery( response );
  }

  port.postMessage( orderTaskMsg );
}

function createOrderItemsObj( jsonStr ) {
  let obj = { items: [] },
      items = JSON.parse( jsonStr ).mainOrders[0].subOrders;

  $( items ).each( function() {
    let item = {
      itemId: this.itemInfo.id,
      amount: this.quantity,
      price: this.priceInfo.realTotal,
      imgUrl: this.itemInfo.pic
    };
    obj.items.push( item );
  })

  return obj;
}


// Test
function testRequest() {
  var task1 = {
    taobaoOrderId: '3254842308974967',
    storeId: '62',
    managerLogin: 'krasrab5',
    taskName: 'getOrderInfo'
  },
      task2 = {
        taobaoOrderId: '17348469765696895',
        storeId: '62',
        managerLogin: 'krasrab',
        taskName: 'getOrderInfo'
      },
      taskTrack1 = {
        taobaoOrderId: '11508210996654967',
        storeId: '53',
        managerLogin: 'krasrab5',
        taskName: 'getTrack'
      },
      taskTrack2 = {
        taobaoOrderId: '17348469773696895',
        storeId: '13',
        managerLogin: 'krasrab',
        taskName: 'getTrack'
      },
      taskTrackUndef = {
        taobaoOrderId: '15546229474696895',
        storeId: '51',
        managerLogin: 'krasrab',
        taskName: 'getTrack'
      };

  // getSendTrack( taskTrack2 );
  getSendOrderData( task2 );
}




// test
