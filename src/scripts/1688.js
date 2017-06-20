'use strict';

var port;

$( document ).ready( () => {
  port = chrome.runtime.connect( {name: '1688'} );

  chrome.runtime.onMessage.addListener( msg => {
    switch ( msg.taskName ){
    case 'getOrderInfo':
    case 'getOrderInfo':
      break;

    case 'getTrack':
      break;

    }
  });

  let i = 0;

  while ( i < 10 ) {
    getOrderDataFromPrintPage( 'https://trade.1688.com/order/buyer_order_print.htm?order_id=', '25079509123696895' ); // работает до 4ех раз быстрее
    // getorderdatafrom( 'https://trade.1688.com/order/new_step_order_detail.htm?orderId=', '25079509123696895' );
    i++;
  }

});

function getOrderDataFromPrintPage( orderUrl, id ) {

  $.ajax({
    url: orderUrl + id,
    success: data => {
      console.log( 'data from print', data );
    },
    error: err => {
      console.log( 'err', err );
    }
  });
}
