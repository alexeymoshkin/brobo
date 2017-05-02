'use strict';

var port;

$( document ).ready( function() {
  port = chrome.runtime.connect( {name: 'yarlan'} );

  chrome.runtime.onMessage.addListener( function( msg ) {
    if ( msg.error  ) {
      switch ( msg.error ) {
      case 'wrongManager':
        alert( 'Вам необходимо войти на таобао под менеджером ' + msg.taskManager );
        break;
      case 'wrongOrderId':
        alert( 'Для магазина ' + msg.storeId + ' указан не правильный номер заказа Таобао: ' + msg.orderId + '. Исправьте номер заказа и попробуйте еще раз.' );
        break;
      default:
        alert( msg.error );
        break;
      }
    } else {
      alert( 'Данные импортированы! Нажмите ОК' );
      location.reload();
    }
  });

  // MAIN FUNCTION
  var findButtonsSetOnclick = setInterval( function () {
    var importButtons = $( 'span.import_from_taobao' ),
        trackButtons = $( 'span.import_track' );

    if ( importButtons.length ) { //&& trackButtons.length
      clearInterval( findButtonsSetOnclick );
      createOnclickAction( importButtons, 'getOrderInfo' );
      createOnclickAction( trackButtons, 'getTrack' );
    }
  }, 500 );

  function createOnclickAction( buttons, task ) {
    $( buttons ).each( function( i ) {
      $( this ).click( function() {
        sendTask( this, task );
      });
    });
  }

  function sendTask( button, task ) {
    var tbOrderId = prompt('Введите номер заказа Taobao').replace( /\s+/g, '' );

    if ( !tbOrderId.match( /^\d{16,}$/g ) ) {
      alert( 'Номер заказа Taobao введен не верно, попробуйте еще раз' );
      return;
    }

    var msg = {
      taobaoOrderId: tbOrderId,
      storeId: $( button ).attr( 'data-store_id' ),
      managerLogin: $( button ).attr( 'data-manager_login' ),
      taskName: task,
      from: 'yarlan'
    };
    port.postMessage( msg );
  }
});
