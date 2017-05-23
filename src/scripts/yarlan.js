'use strict';

const tracksEP = 'http://ap.yarlan.ru/site/db/saver.php?action=getOrderForTrackImport&manager_login=',
      statusesEP = 'http://ap.yarlan.ru/site/db/saver.php?action=getOrdersForStatusImport&manager_login=',
      alerts = {
        done: {
          'getAllTracks': 'Трек номера импортированы! Нажмите "ОК"',
          'getAllStatuses': 'Taobao статусы для заказов импортированы! Нажмите "ОК"',
          'getOrderInfo': 'Данные по заказу импортированы! Нажмите "ОК"',
          'getTrack': 'Трек номер для этого заказа импортирован! Нажмите "ОК"'
        }
      },
      multiTask = ['getAllTracks', 'getAllStatuses'];

var port;

$( document ).ready( function() {
 port = chrome.runtime.connect( {name: 'yarlan'} );

  chrome.runtime.onMessage.addListener( function( msg ) {
    if ( multiTask.includes( msg.task.taskName ) ) {
      if ( msg.task.done ) {
        alert( alerts.done[ msg.task.taskName ] );
        location.reload();
      }
      return;
    }

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
      alert( alerts.done[msg.task.taskName] );
      location.reload();
    }
  });

  // import tracks for all orders
  var findTrackButtonSetOnclick = setInterval( () => {
    let button = $( 'a#ImportTrackForAllOrders' );

    if( button ) {
      clearInterval( findTrackButtonSetOnclick );
      createRequest( button, tracksEP, 'getAllTracks' );
    }
  }, 100);

  // import status for all orders
  var findStatusButtonSetOnclick = setInterval( () => {
    let button = $( 'a#ImportStatusForAllOrders' );

    if( button ) {
      clearInterval( findStatusButtonSetOnclick );
      createRequest( button, statusesEP, 'getAllStatuses' );
    }
  }, 100);

  // import track and taobao info for single order
  var findButtonsSetOnclick = setInterval( () => {
    let importButtons = $( 'span.import_from_taobao' ),
        trackButtons = $( 'span.import_taobao_track' );

    if( importButtons.length && trackButtons.length ) {
      clearInterval( findButtonsSetOnclick );
      createOnclickAction( importButtons, 'getOrderInfo' );
      createOnclickAction( trackButtons, 'getTrack' );
    }
  }, 250 ); //500

  function createOnclickAction( buttons, taskName ) {
    $( buttons ).each( function( i ) {
      $( this ).click( function() {
        sendTask( this, taskName );
      });
    });
  }

  function createRequest( button, uri, taskName ) {
    var manager = $( button ).attr( 'data-manager_login' ),
        url = uri + manager,
        msg = {
          managerLogin: manager,
          taskName: taskName,
          from: 'yarlan'
        };

    $( button ).click( function() {
      $.ajax({
        url: url,
        success: response => {
          if( response.data.length ) {
            msg.ordersIds = response.data;
            port.postMessage( msg );
          } else {
            alert( 'Нечего импортировать' );
          }
        },
        error: err => {
          alert( `Ответ сервера: ${err.status}, текст ошибки: ${err.statusText}` );
        }
      });
    });
  }

  function sendTask( button, taskName ) {
    var maybeOrderId = $( button ).attr( 'data-taobao_order_id' ),
        tbOrderId = maybeOrderId || prompt('Введите номер заказа Taobao').replace( /\s+/g, '' ),
        msg = {
          storeId: $( button ).attr( 'data-store_id' ),
          managerLogin: $( button ).attr( 'data-manager_login' ),
          taskName: taskName,
          from: 'yarlan'
        };

    if ( !tbOrderId.match( /^\d{16,}$/g ) ) {
      alert( 'Номер заказа Taobao введен не верно, попробуйте еще раз' );
      return;
    }

    msg.taobaoOrderId = tbOrderId;
    port.postMessage( msg );
  }
});
