// Receive_meteo.js è un semplice consumer, riceve informazioni dal publisher e le stampa su shell
var amqp = require('amqplib/callback_api');

amqp.connect('amqp://localhost', function(error0, connection) {
	if (error0) {
    throw error0;
  }
  connection.createChannel(function(error1, channel) {
    if (error1) {
      throw error1;
    }
    var exchange = 'direct_logs';
	channel.assertExchange(exchange, 'direct', {durable: true});
	channel.assertQueue('', {
      exclusive: true
      }, function(error2, q) {
        if (error2) {
          throw error2;
        }
      console.log(' [*] Waiting for logs. To exit press CTRL+C');
	  channel.bindQueue(q.queue, exchange, 'meteo');
	  channel.consume(q.queue,function(msg){
		  console.log(msg.content.toString());
	  },{
		  noAck : true
	  });
	  });
  });
});
	  