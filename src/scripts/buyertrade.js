'use strict';

// Test
function testRequest() {
  var task1 = {
    taobaoOrderId: '3254842308974967',
    storeId: '62',
    managerLogin: 'krasrab5',
    taskName: 'getOrderInfo'
  },
      task2 = {
        taobaoOrderId: '9287608309696895',
        storeId: '62',
        managerLogin: 'krasrab',
        taskName: 'getOrderInfo'
      };

  getSendOrderData( task1 );
}
// Test

var apiUrl = 'http://ap.yarlan.ru/site/db/saver.php',
    port,
    formDataStr = 'buyerNick&dateBegin=0&dateEnd=0&lastStartRow&logisticsService&options=0&orderStatus&queryBizType&queryOrder=desc&rateStatus&refund&sellerNick&pageNum=1&pageSize=15';

$( document ).ready( function() {
  port = chrome.runtime.connect( {name: 'taobao'} );

  chrome.runtime.onMessage.addListener( function( msg ) {
    getSendOrderData( msg );
  });
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
  var orderUrl = "https://buyertrade.taobao.com/trade/itemlist/asyncBought.htm?action=itemlist/BoughtQueryAction&event_submit_do_query=1&_input_charset=utf8",
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
        error: 'Не удалось получить данные'
      });
    } else {
      sendMessageToBg( this.responseText, task );
    }
  };
}

function getDelivery( data ) {
  var dataObj = JSON.parse( data ),
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
  var msg = {
    task: task,
    from: 'taobao'
  };

  if ( isItemsNotExist( response ) ) {
    msg.error = 'Номер заказа не соответствует менеджеру Taobao';
  } else {
    msg.orderData = JSON.parse( response );
    msg.orderItemsData = createOrderItemsObj( response );
    msg.task.delivery = getDelivery( response );
  }
  port.postMessage( msg );
}

function createOrderItemsObj( jsonStr ) {
  var obj = { items: [] },
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
