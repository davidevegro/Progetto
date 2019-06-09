# Il progetto prevede 2 applicazioni del tipo producer/consumer che si interfacciano tramite RabbitMQ

È necessario eseguire il comando `npm install` nella cartella contenente l'applicazione, inoltre per usufruire dell'app è necessario avere 
un profilo twitter e inserire la propria posizione(città)

L'applicazione `meteo.js` è un semplice produttore che ottiene l'autorizzazione da parte dell'utente ad accedere alle sue protected 
resources su twitter, il flusso per ottenere l'autorizzazione è quello previsto dal 3-legged authorization :

https://developer.twitter.com/en/docs/basics/authentication/overview/3-legged-oauth

L'applicazione prevede due funzioni `app.get('/connect', function(req, res){...}` e `app.get('/get_access_token',function(req,res){...}`. 

La prima viene utilizzata per ottenere il request token dall'endpoint twitter https://api.twitter.com/oauth/request_token in particolare 
costruiamo la POST utilizzando un nonce ASCII, un timestamp, la consumer key del client e il tipo di signature, in questo caso è richiesto 
l'uso di HMAC-SHA1. Per quanto riguarda il calcolo della signature viene utilizzato il metodo suggerito da Twitter 
https://developer.twitter.com/en/docs/basics/authentication/guides/creating-a-signature.html, i valori vengono passati all'algoritmo per 
il calcolo dell'HMAC-SHA1,quest'ultimo definito da una funzione esterna:

https://gist.github.com/yajd/9103325

Una volta ricavato il request token è possibile reindirizzare l'utente sull'endpoint twitter `https://api.twitter.com/oauth/authorize?
oauth_token='+oauth_token` al fine di ottenere un token authorized. 
Autorizzata l'app,l'utente viene reindirizzato dal service provider verso la callback URI dell'applicazione 
(http://localhost:8080/get_access_token).

Entra in gioco ora la seconda funzione `app.get('/get_access_token',function(req,res){...}`, nella URL dopo il reinidirizzamento verso la 
callback è possibile ricavare un nuovo token(`oauth_ver`) necessario per guadagnare l'access token tramite l'endpoint Twitter 
https://api.twitter.com/oauth/access_token?oauth_verifier=, ora è possibile accedere alle risorse dell'utente usando l'access 
token(`req.session.access`) e l'access token secret(`req.session.access_secret`) appena ricevuto, con la chiamata verso 
https://api.twitter.com/1.1/account/verify_credentials.json è possibile ottenere informazioni in formato JSON riguardo l'utente,tra 
queste prendiamo il valore `location`. Otteniamo ora le previsioni meteo per i prossimi 5 giorni facendo una GET alla API Openweathermap e le inviamo tramite l'exchange `direct_logs` alla coda `meteo`. 

L'applicazione `Receive_meteo.js` implementa un consumatore, crea la coda `meteo`,che viene bindata all'exchange `direct_logs` , ottiene i messaggi dal publisher e li stampa su console.






