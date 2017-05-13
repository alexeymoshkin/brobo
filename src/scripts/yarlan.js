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

  // MAIN FUNCTIONS
  var findTrackButtonSetOnclick = setInterval( function() {
    let button = $( 'a#ImportTrackForAllOrders' );

    if( button ) {
      clearInterval( findTrackButtonSetOnclick );
      createOnclickRequest( button );
    }
  }, 100);

  var findButtonsSetOnclick = setInterval( function() {
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

  function createOnclickRequest( button ) {
    var manager = $( button ).attr( 'data-manager_login' ),
        url = `http://ap.yarlan.ru/site/db/saver.php?action=getOrderForTrackImport&manager_login=${manager}`,
        msg = {
          managerLogin: manager,
          taskName: 'getAllTracks',
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
            alert( 'Нечего экспортировать' );
          }
        },
        error: err => {
          alert( `Ошибка запроса: ${err}` );
        }
      });
    })
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
