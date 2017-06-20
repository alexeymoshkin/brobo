'use strict';

var port,
    formDataStr = 'buyerNick&dateBegin=0&dateEnd=0&lastStartRow&logisticsService&options=0&orderStatus&queryBizType&queryOrder=desc&rateStatus&refund&sellerNick&pageNum=1&pageSize=15',
    trackTaskName = {
      'getOrderInfo': 'getTrack',
      'getTrack': 'getTrack',
      'getAllTracks': 'getAllTracks'
    };

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
      handleGetAllSmth( msg, getSendTrack );
      break;

    case 'getAllStatuses':
      handleGetAllSmth( msg, getSendOrderData );
      break;
    }
  });

  // testRequest();
  // getOrderPage();
});

function handleGetAllSmth( msg, getOneSmth ) {
  $( msg.ordersIds ).each( function( index ) {
    (function( that, i ) {
      let task = {
        length: msg.ordersIds.length,
        storeId: that.store_id,
        managerLogin: msg.managerLogin,
        taskName: msg.taskName,
        taobaoOrderId: that.taobao_order_id
      };

      var t = setTimeout( () => {
        if ( ++i == task.length ) {
          task.done = true;
        }

        getOneSmth( task );
      }, 700 * i );
    })( this, index );
  });
}

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
      let data = JSON.parse( this.responseText );
      responseHandler( data, task );
    }
  };
}

function responseHandler( data, task ) {
  switch ( task.taskName ) {
  case 'getOrderInfo':
    maybeSendTrack( data, task );
    sendMessageToBg( data, task );
    break;

  case 'getAllStatuses':
    sendMessageToBg( data, task );
    break;
  }
}

function maybeSendTrack( data, task ) {
  let orderOperations = data.mainOrders[0].statusInfo.operations;

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
        taskName: trackTaskName[task.taskName],
        done: task.done
      },
      trackTaskMsg = {
        task: trackTask,
        from: 'taobao'
      };

  $.ajax({
    url: trackUrl,
    success: data => {
      if ( data.isSuccess == 'true' ) {
        trackTaskMsg.task.track = data.expressId;
      } else if ( task.taskName !== 'getAllTracks' ) {
        trackTaskMsg.error = 'Информация по треку не найдена';
      }
      port.postMessage( trackTaskMsg );
    },
    error: err => {
      if ( task.taskName !== 'getAllTracks' ) {
        trackTaskMsg.error = `Ответ сервера: ${err.status}, текст ошибки: ${err.statusText}`;
      }
      port.postMessage( trackTaskMsg );
    }
  });
}

function getOptsArr( item ) {
  let optsObj = item.itemInfo.skuText,
      optsArr = [];

  if ( optsObj == {} ) return [];

  $( optsObj ).each( function(){
    optsArr.push( `${this.name}: ${this.value}` );
  });

  return optsArr;
}

function getDelivery( orderObj ) {
  return orderObj.mainOrders[0].payInfo.postFees[0].value.replace("￥", '');
}

function getStatus( orderObj ) {
  return orderObj.mainOrders[0].extra.tradeStatus;
}

function isItemsNotExist( orderObj ) {
  if ( $.isEmptyObject( orderObj ) ) return true;
  if ( orderObj.mainOrders && orderObj.mainOrders.length ) return false;

  return true;
}

function isItemEmpty( item ) {
  if ( !item.id ) return true;
  return false;
}

function isItemCanceled( item ) {
  let operationsStr = JSON.stringify( item.operations );

  if ( operationsStr.indexOf( '"style":"t8"' ) > -1 ) {
    return true;
  }
  return false;
}

function sendMessageToBg( data, task ) {
  let orderTask = {
    taobaoOrderId: task.taobaoOrderId,
    storeId: task.storeId,
    managerLogin: task.managerLogin,
    taskName: task.taskName,
    done: task.done
  },
      orderTaskMsg = {
        task: orderTask,
        from: 'taobao'
      };

  if ( isItemsNotExist( data ) ) {
    orderTaskMsg.error = 'Номер заказа не соответствует менеджеру Taobao';
  } else {
    switch ( task.taskName ) {
    case 'getAllStatuses':
      orderTaskMsg.task.orderStatus = getStatus( data );
      orderTaskMsg.task.orderPayDate = getOrderPageData( orderTask.taobaoOrderId, getOrderPayDate );

      break;

    case 'getOrderInfo':
      orderTaskMsg.orderData = data;
      orderTaskMsg.orderItemsData = createOrderItemsObj( data );
      orderTaskMsg.task.delivery = getDelivery( data );
      orderTaskMsg.task.orderStatus = getStatus( data );
      break;
    }
  }

  port.postMessage( orderTaskMsg );
}

function createOrderItemsObj( orderObj ) {
  let obj = { items: [] },
      items = orderObj.mainOrders[0].subOrders;

  $( items ).each( function() {
    if ( isItemEmpty( this ) ) return;
    let item = {
      itemId: this.itemInfo.id,
      options: getOptsArr( this ),
      amount: this.quantity,
      price: this.priceInfo.realTotal,
      imgUrl: this.itemInfo.pic,
      cancel: isItemCanceled( this )
    };
    obj.items.push( item );
  })

  return obj;
}

function getOrderPageData( orderId, getData ) {
  let orderData,
      handleTmallOrder = orderId => {
        $.ajax({
          type: 'POST',
          url: `trade.tmall.com/detail/orderDetail.htm?bizOrderId=${orderId}`,
          async: true,
          success: page => {
            let data = page.match( /var detailData = (.+)/ )[1],
                dataObj = JSON.parse( data );

            orderData = getData( dataObj );
          },
          error: err => {
            console.log( 'ERRROR', err );
          }
        });
      };

  $.ajax({
    url: `https://trade.taobao.com/trade/detail/trade_order_detail.htm?biz_order_id=${orderId}`,
    async: false,
    success: page => {
      let data = page.match( /var data = (.+)/ )[1],
          dataObj = JSON.parse( data );

      orderData = getData( dataObj );
    },
    error: err => {
      if ( err.readyState == 0 && err.status == 0 ) handleTmallOrder( orderId );
    }
  });

  return orderData;
}

function getOrderPayDate( dataObj ) {
  let tbDates = dataObj.orderBar,
      tmDates = dataObj.stepbar,
      payDate;

  if ( tbDates ) payDate = tbDates.nodes[1].date;
  if ( tmDates ) payDate = tmDates.options[1].time;

  return payDate;
}


//////////////////////// TEST ////////////////////////

function testRequest() {
  var task1 = {
    taobaoOrderId: '3254842308974967',
    storeId: '62',
    managerLogin: 'krasrab5',
    taskName: 'getOrderInfo'
  },
      taskCancelled = {
        taobaoOrderId: '20120511558696895',
        storeId: '62',
        managerLogin: 'krasrab',
        taskName: 'getOrderInfo'
      },
      task2 = {
        taobaoOrderId: '20829391945696895',
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
  var getTracksMsg = {
    managerLogin: 'krasrab',
    taskName: 'getAllTracks',
    ordersIds: [
      {
        manager: "krasrab",
        store_id: "33",
        taobao_order_id: "14525968699696895"
      },
      {
        manager: "krasrab",
        store_id: "34",
        taobao_order_id: "20951271040696895"
      },
      {
        manager: "krasrab",
        store_id: "35",
        taobao_order_id: "20829391945696895"
      },
      {
        manager: "krasrab",
        store_id: "31",
        taobao_order_id: "18344711109696895"
      },
      {
        manager: "krasrab",
        store_id: "37",
        taobao_order_id: "17973749221696895"
      }
    ]
  };

  // getSendTrack( taskTrack2 );
  getSendOrderData( taskCancelled );
}
