/* METEO.JS UTILIZZA IL FLUSSO OUATH 1.0 PER L'AUTENTICAZIONE DELL'UTENTE SU TWITTER, OTTIENE DALL'ENDPOINT TWITTER 
https://api.twitter.com/1.1/account/verify_credentials.json L'INFORMAZIONE RELATIVA ALLA POSIZIONE DELL'UTENTE. CON UNA RICHIESTA ALLA API
OPENWEATHERMAP OTTIENE LE PREVISIONI METEO DELLA CITTà DEI PROSSIMI 5 GIORNI, LE INFORMAZIONI OTTENUTE VERRANNO PASSATE AD UNA CODA DI MESSAGGI 
TRAMITE RABBITMQ. */


/* Per il calcolo della oauth signature ho usato una funzione esterna https://gist.github.com/yajd/9103325 */


var jsSHA = require("jssha");
var oauthNonce = require("oauth_nonce");
var express = require ('express');
var https = require("https");
var session = require('express-session');
var request = require('request');
var amqp = require('amqplib/callback_api');

var app = express();
var connect;
initSHA1(this);

app.use(session({ secret : 'omaewamoushindeirou',resave: false, saveUninitialized: true}));
app.listen('8080',function(){
	console.log('listening on 8080');
});

amqp.connect('amqp://localhost', function(error0, connection) {
  if(error0){ throw error0; }
  connect=connection;
});

app.get('/',function(req,res){

	
	res.redirect('http://localhost:8080/connect');
	return;
});

app.get('/connect', function(req, res){
	//costruisco la chiamata POST per ottenere il request_token non ancora valido
	
	//genero nonce 
	oauthNonce( function( value ) {
	
		return value;
	});
	var nonce = oauthNonce();
	//genero timestamp
	var timestamp = Math.floor(Date.now() / 1000);
	
	var parameter_string = "oauth_consumer_key=9YL3Ua7oSfNlk8mdm2vlbcZ7v&oauth_nonce="+nonce+"&oauth_signature_method=HMAC-SHA1&oauth_timestamp="+timestamp+"&oauth_version=1.0";
	//genero la url percent encoded
	var url_enc = encodeURIComponent('https://api.twitter.com/oauth/request_token');
	//genero parameter_string percent encoded
	var par_enc = encodeURIComponent(parameter_string);
	var signature_base = "POST&"+url_enc+"&"+par_enc;
	var secret_enc = encodeURIComponent("O6Cag4ATg4tDGzTGFVTPdp2dsRTenRyQrLWgQSp9pEsj49WJan");
	var sign_key = secret_enc+"&";
	//calcolo la signature key e la codifico con il metodo URL encoded
	var hashedVal = calcHMAC(signature_base, sign_key);
	var hash = encodeURIComponent(hashedVal);
	
	//faccio la stessa cosa per la richiesta dell'access token e per verify credentials https://developer.twitter.com/en/docs/basics/authentication/guides/creating-a-signature.html
	
	
	
	//costruisco la request POST per l'ottenimento del request token
	var options = {
		
		hostname: "api.twitter.com",

		port: 443,

		method: 'POST',

		path: "/oauth/request_token",
		"headers": {
			"authorization": `OAuth realm="https://api.twitter.com/oauth/request_token",oauth_consumer_key="9YL3Ua7oSfNlk8mdm2vlbcZ7v",oauth_nonce=`+nonce+`,oauth_signature_method="HMAC-SHA1",oauth_signature=`+hash+`,oauth_timestamp=`+timestamp+`,oauth_version="1.0"`,
		}

    };
	
	
	var oauth_token;
	req.session.oAuthTokenSecret;
	
	
	const request0 = https.request(options, function(resp) {
		let tok = "";

		resp.on("data", function(chunk) {
			tok+=chunk;
		});

		resp.on("end", function() {
			
			oauth_token = tok.substring(12,39); //ottengo oauth token facendo substring della stringa che ottengo dalla callback di twitter (valori nelle substring fissi)
			req.session.oAuthTokenSecret = tok.substring(59,91); //ottengo oauth token secret facendo substring della stringa che ottengo dalla callback di twitter 
			console.log("ho ottenuto request_token : " + oauth_token + " ,request_token_secret : " + req.session.oAuthTokenSecret);
			console.log("---------------------------------------------------------");
			//reindirizzo per ottenere l'autorizzazione da parte dell'utente
			res.redirect('https://api.twitter.com/oauth/authorize?oauth_token='+oauth_token);
		});
	});

	request0.end();
	
	
});

// localhost:8080/get_access_token è la callback che abbiamo specificato per questa app nel service provider 
app.get('/get_access_token',function(req,res){
	
	var oauth_ver = req.query.oauth_verifier; 
	var oauth_token = req.query.oauth_token;
	var oauth_secret = req.session.oAuthTokenSecret;
	console.log("request_token : " + req.query.oauth_token + " ,request_token_secret : " + req.session.oAuthTokenSecret+ " ,ho ottenuto verifier_token : " +req.query.oauth_verifier);
	console.log("---------------------------------------------------------");
	
	//genero nonce 
	oauthNonce( function( value ) {
	
		return value;
	});
	var nonce = oauthNonce();
	//genero timestamp
	var timestamp = Math.floor(Date.now() / 1000);
	
	var parameter_string = "oauth_consumer_key=9YL3Ua7oSfNlk8mdm2vlbcZ7v&oauth_nonce="+nonce+"&oauth_signature_method=HMAC-SHA1&oauth_timestamp="+timestamp+"&oauth_token="+oauth_token+"&oauth_version=1.0";
	//genero la url percent encoded
	var url_enc = encodeURIComponent('https://api.twitter.com/oauth/access_token');
	//genero parameter_string percent encoded
	var par_enc = encodeURIComponent(parameter_string);
	var signature_base = "POST&"+url_enc+"&"+par_enc;
	var secret_enc = encodeURIComponent("O6Cag4ATg4tDGzTGFVTPdp2dsRTenRyQrLWgQSp9pEsj49WJan");
	var token_secret_enc = encodeURIComponent(oauth_secret);
	var sign_key = secret_enc+"&"+token_secret_enc;
	var hashedVal = calcHMAC(signature_base, sign_key);
	var hash = encodeURIComponent(hashedVal);
	
	//chiedo access token 
	var options = {
		
		hostname: "api.twitter.com",

		port: 443,

		method: 'POST',

		path: "/oauth/access_token?oauth_verifier="+oauth_ver,
		"headers": {
			"authorization": `OAuth realm="https://api.twitter.com/oauth/access_token",oauth_verifier=`+oauth_ver+`,oauth_consumer_key="9YL3Ua7oSfNlk8mdm2vlbcZ7v",oauth_nonce=`+nonce+`,oauth_signature_method="HMAC-SHA1",oauth_signature=`+hash+`,oauth_timestamp=`+timestamp+`,oauth_token=`+oauth_token+`,oauth_version="1.0"`,
		}
	}
	
	const request1 = https.request(options, function(resp) {
		let tok = "";
		resp.on("data", function(chunk) {
			tok+=chunk;
		});
		resp.on("end", function() {
			
			
			var access = tok.substring(12,62); 
			var access_secret = tok.substring(82,127); 
			console.log("ho ottenuto access token : " + access + " e access secret : " + access_secret);
			
			
			//ora che ho ottenuto l'access token posso scambiarlo per accedere alle protected resources dell'utente
			// prendo verify_credentials
			//genero nonce 
			var nonce1 = oauthNonce();
			//genero timestamp
			var timestamp1 = Math.floor(Date.now() / 1000);
			var parameter_string1 = "oauth_consumer_key=9YL3Ua7oSfNlk8mdm2vlbcZ7v&oauth_nonce="+nonce1+"&oauth_signature_method=HMAC-SHA1&oauth_timestamp="+timestamp1+"&oauth_token="+req.session.access+"&oauth_version=1.0";
			//genero la url percent encoded
			var url_enc1 = encodeURIComponent('https://api.twitter.com/1.1/account/verify_credentials.json');
			//genero parameter_string percent encoded
			var par_enc1 = encodeURIComponent(parameter_string1);
			var signature_base1 = "GET&"+url_enc1+"&"+par_enc1;
			var secret_enc1 = encodeURIComponent("O6Cag4ATg4tDGzTGFVTPdp2dsRTenRyQrLWgQSp9pEsj49WJan");
			var token_secret_enc1 = encodeURIComponent(req.session.access_secret);
			var sign_key1 = secret_enc1+"&"+token_secret_enc1;
			var hashedVal1 = calcHMAC(signature_base1, sign_key1);
			var hash1 = encodeURIComponent(hashedVal1);
					
			
			var options2 = {
		
				hostname: "api.twitter.com",

				port: 443,

				method: 'GET',
				
				path: "/1.1/account/verify_credentials.json",
				
				"headers": {
					"authorization": `OAuth realm="https://api.twitter.com/1.1/account/verify_credentials.json",oauth_consumer_key="9YL3Ua7oSfNlk8mdm2vlbcZ7v",oauth_nonce=`+nonce1+`,oauth_signature=`+hash1+`,oauth_signature_method="HMAC-SHA1",oauth_timestamp=`+timestamp1+`,oauth_token=`+access+`,oauth_version="1.0"`,
					
				}
				
				
			}
				
				const request2 = https.request(options2, function(response) {
					let data = "" ;
					
					response.on("data", function(dati){
						data += dati;
						
						
					});
					response.on("end",function(){
						credenziali = JSON.parse(data);
						
						
						console.log("---------------------------------------------------------");
						console.log("inviando meteo per "+credenziali.location+" a coda");
						res.send("inviato meteo a Receive_meteo");
						
						//ho ottenuto la città ora chiamo la API OPENWEATHERMAP e trasferisco le info a rabbitmq;
						let url = "https://api.openweathermap.org/data/2.5/forecast?q="+credenziali.location+"&appid=21936a2c54dddc884faf7609c8fa27b6&units=metric";
						request(url,function(err,response,body) {
							
							
							let tempo = JSON.parse(body);
							let temp;
							let hum;
							let weather;
							let date;
							connect.createChannel(function(error1, channel) {
								if (error1) {
									throw error1;
								}
								var exchange = 'direct_logs';
								channel.assertExchange(exchange, 'direct', {
									durable: true
								});
								
								for(let i = 0; i < 40; i++) {
								temp = tempo.list[i].main.temp;
								hum = tempo.list[i].main.humidity;
								weather = tempo.list[i].weather[0].description;
								date = tempo.list[i].dt_txt;
								var msg = "giorno ora : " + date + "\n"+ "condizioni meteo : " + weather + "\n" +"temperatura : "+temp+"\n"+"umidità :"+hum + "%"
								
								channel.publish(exchange,'meteo',Buffer.from(msg));
								
								
								}
							});
							
							
						
						});
						
				
					
					
				
					});
				});
				
				request2.end();
				
			
		});
			
			
			
			
			
			
	});
	request1.end();
});
	


function calcHMAC(input, inputKey) { //MUST place this function below the block of yucky code above
    //currently set up to take inputText and inputKey as text and give output as SHA-1 in base64
    //var inputText = 'stuff you want to convert'; //must be text, if you use Base64 or HEX then change hmacInputType on line 34
    //var inputKey = 'key to use in conversion'; //must be text, if you use Base64 or HEX then change hmacKeyInputType on line 35
    try {
        var hmacInputType = 'TEXT'; //other values: B64, HEX
        var hmacKeyInputType = 'TEXT'; //other values: B64, HEX
        var hmacVariant = 'SHA-1'; //other values NOT SUPPORTED because js for it was stripped out of the src code for optimization: SHA-224, SHA-256, SHA-384, SHA-512
        var hmacOutputType = 'B64';
        var hmacObj = new jsSHA(input, hmacInputType);
        
        return hmacObj.getHMAC(
            inputKey,
            hmacKeyInputType,
            hmacVariant,
            hmacOutputType
        );
    } catch(e) {
        return e
    }
}

/*
 A JavaScript implementation of the SHA-1 ONLY hash, as
 defined in FIPS PUB 180-2 as well as the corresponding HMAC implementation
 as defined in FIPS PUB 198a
 Copyright Brian Turek 2008-2013
 Distributed under the BSD License
 See http://caligatio.github.com/jsSHA/ for more information
 Several functions taken from Paul Johnston
*/
function initSHA1(A){function q(a,d,b){var f=0,e=[0],c="",g=null,c=b||"UTF8";if("UTF8"!==c&&"UTF16"!==c)throw"encoding must be UTF8 or UTF16";if("HEX"===d){if(0!==a.length%2)throw"srcString of HEX type must be in byte increments";g=t(a);f=g.binLen;e=g.value}else if("ASCII"===d||"TEXT"===d)g=v(a,c),f=g.binLen,e=g.value;else if("B64"===d)g=w(a),f=g.binLen,e=g.value;else throw"inputFormat must be HEX, TEXT, ASCII, or B64";this.getHash=function(a,b,c,d){var g=null,h=e.slice(),k=f,m;3===arguments.length?"number"!==
typeof c&&(d=c,c=1):2===arguments.length&&(c=1);if(c!==parseInt(c,10)||1>c)throw"numRounds must a integer >= 1";switch(b){case "HEX":g=x;break;case "B64":g=y;break;default:throw"format must be HEX or B64";}if("SHA-1"===a)for(m=0;m<c;m++)h=s(h,k),k=160;else throw"Chosen SHA variant is not supported";return g(h,z(d))};this.getHMAC=function(a,b,d,g,q){var h,k,m,l,r=[],u=[];h=null;switch(g){case "HEX":g=x;break;case "B64":g=y;break;default:throw"outputFormat must be HEX or B64";}if("SHA-1"===d)k=64,l=
160;else throw"Chosen SHA variant is not supported";if("HEX"===b)h=t(a),m=h.binLen,h=h.value;else if("ASCII"===b||"TEXT"===b)h=v(a,c),m=h.binLen,h=h.value;else if("B64"===b)h=w(a),m=h.binLen,h=h.value;else throw"inputFormat must be HEX, TEXT, ASCII, or B64";a=8*k;b=k/4-1;if(k<m/8){if("SHA-1"===d)h=s(h,m);else throw"Unexpected error in HMAC implementation";h[b]&=4294967040}else k>m/8&&(h[b]&=4294967040);for(k=0;k<=b;k+=1)r[k]=h[k]^909522486,u[k]=h[k]^1549556828;if("SHA-1"===d)d=s(u.concat(s(r.concat(e),
a+f)),a+l);else throw"Unexpected error in HMAC implementation";return g(d,z(q))}}function v(a,d){var b=[],f,e=[],c=0,g;if("UTF8"===d)for(g=0;g<a.length;g+=1)for(f=a.charCodeAt(g),e=[],2048<f?(e[0]=224|(f&61440)>>>12,e[1]=128|(f&4032)>>>6,e[2]=128|f&63):128<f?(e[0]=192|(f&1984)>>>6,e[1]=128|f&63):e[0]=f,f=0;f<e.length;f+=1)b[c>>>2]|=e[f]<<24-c%4*8,c+=1;else if("UTF16"===d)for(g=0;g<a.length;g+=1)b[c>>>2]|=a.charCodeAt(g)<<16-c%4*8,c+=2;return{value:b,binLen:8*c}}function t(a){var d=[],b=a.length,f,
e;if(0!==b%2)throw"String of HEX type must be in byte increments";for(f=0;f<b;f+=2){e=parseInt(a.substr(f,2),16);if(isNaN(e))throw"String of HEX type contains invalid characters";d[f>>>3]|=e<<24-f%8*4}return{value:d,binLen:4*b}}function w(a){var d=[],b=0,f,e,c,g,p;if(-1===a.search(/^[a-zA-Z0-9=+\/]+$/))throw"Invalid character in base-64 string";f=a.indexOf("=");a=a.replace(/\=/g,"");if(-1!==f&&f<a.length)throw"Invalid '=' found in base-64 string";for(e=0;e<a.length;e+=4){p=a.substr(e,4);for(c=g=0;c<
p.length;c+=1)f="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".indexOf(p[c]),g|=f<<18-6*c;for(c=0;c<p.length-1;c+=1)d[b>>2]|=(g>>>16-8*c&255)<<24-b%4*8,b+=1}return{value:d,binLen:8*b}}function x(a,d){var b="",f=4*a.length,e,c;for(e=0;e<f;e+=1)c=a[e>>>2]>>>8*(3-e%4),b+="0123456789abcdef".charAt(c>>>4&15)+"0123456789abcdef".charAt(c&15);return d.outputUpper?b.toUpperCase():b}function y(a,d){var b="",f=4*a.length,e,c,g;for(e=0;e<f;e+=3)for(g=(a[e>>>2]>>>8*(3-e%4)&255)<<16|(a[e+1>>>
2]>>>8*(3-(e+1)%4)&255)<<8|a[e+2>>>2]>>>8*(3-(e+2)%4)&255,c=0;4>c;c+=1)b=8*e+6*c<=32*a.length?b+"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charAt(g>>>6*(3-c)&63):b+d.b64Pad;return b}function z(a){var d={outputUpper:!1,b64Pad:"="};try{a.hasOwnProperty("outputUpper")&&(d.outputUpper=a.outputUpper),a.hasOwnProperty("b64Pad")&&(d.b64Pad=a.b64Pad)}catch(b){}if("boolean"!==typeof d.outputUpper)throw"Invalid outputUpper formatting option";if("string"!==typeof d.b64Pad)throw"Invalid b64Pad formatting option";
return d}function B(a,d){return a<<d|a>>>32-d}function C(a,d,b){return a^d^b}function D(a,d,b){return a&d^~a&b}function E(a,d,b){return a&d^a&b^d&b}function F(a,d){var b=(a&65535)+(d&65535);return((a>>>16)+(d>>>16)+(b>>>16)&65535)<<16|b&65535}function G(a,d,b,f,e){var c=(a&65535)+(d&65535)+(b&65535)+(f&65535)+(e&65535);return((a>>>16)+(d>>>16)+(b>>>16)+(f>>>16)+(e>>>16)+(c>>>16)&65535)<<16|c&65535}function s(a,d){var b=[],f,e,c,g,p,q,s=D,t=C,v=E,h=B,k=F,m,l,r=G,u,n=[1732584193,4023233417,2562383102,
271733878,3285377520];a[d>>>5]|=128<<24-d%32;a[(d+65>>>9<<4)+15]=d;u=a.length;for(m=0;m<u;m+=16){f=n[0];e=n[1];c=n[2];g=n[3];p=n[4];for(l=0;80>l;l+=1)b[l]=16>l?a[l+m]:h(b[l-3]^b[l-8]^b[l-14]^b[l-16],1),q=20>l?r(h(f,5),s(e,c,g),p,1518500249,b[l]):40>l?r(h(f,5),t(e,c,g),p,1859775393,b[l]):60>l?r(h(f,5),v(e,c,g),p,2400959708,b[l]):r(h(f,5),t(e,c,g),p,3395469782,b[l]),p=g,g=c,c=h(e,30),e=f,f=q;n[0]=k(f,n[0]);n[1]=k(e,n[1]);n[2]=k(c,n[2]);n[3]=k(g,n[3]);n[4]=k(p,n[4])}return n}"function"===typeof define&&
typeof define.amd?define(function(){return q}):"undefined"!==typeof exports?"undefined"!==typeof module&&module.exports?module.exports=exports=q:exports=q:A.jsSHA=q};


	
