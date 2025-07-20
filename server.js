var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var axios = require('axios');
app.get('/', function(req, res) {
	res.sendFile(__dirname + '/client.html');
});
app.get('/marty.martyscript', function(req, res) {
	res.sendFile(__dirname + '/marty.html');
});
var file = 'chat.json';
var count = 1;
var members = {};
var chatmessages = [];
function GetFilename(members){
	return 'memberChat/chat-'+members.join('_and_')+'.json';
}
function GetMessage(fileName = file){
 /* const dataBuffer = fs.readFileSync(fileName);
  const dataJSON = dataBuffer.toString();*/
  return chatmessages;//JSON.parse(dataJSON);
}
function AddMessage(message, fileName = file){
  var messages = GetMessage();
  messages.push(message);
  chatmessages = messages
  /*var addmessage = JSON.stringify(messages);
  fs.writeFileSync(fileName, addmessage);*/
}
io.on('connection', function(socket) {
  io.emit('member change', members);
	console.log('user connected: ', socket.id);
	var name = "user" + count++;
	io.to(socket.id).emit('change name', name);
	members[name] = {id: socket.id};
	socket.on('disconnect', function() {
    delete members[name];
    io.emit('member change', members);
		io.emit('server message', {type: 'disconnected', name: name});
		/*fs.appendFile(file, "\n" + name + " disconnected.", function(err) {
			// if (err) throw err;
		});*/
    	AddMessage({type: 'disconnected', name: name});
		console.log('user disconnected: ', socket.id);
	});
	socket.on('send message', function(msg) {
		msg.message = msg.message.replace(/<[^>]*>?/g, '');
        msg.message = msg.message.replace(/(\b(https?):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim, '<a href="$1" target="_blank">$1</a>');
                
		console.log(msg);
		if(msg.fromMembers != undefined){
			msg.fromMemberIds.forEach(element => {
				io.to(element).emit('receive message', msg);
			});
			AddMessage(msg, GetFilename(msg.fromMembers));
			return;
		}
		io.emit('receive message', msg);
		//fs.appendFile(file, "\n" + msg, function(err) {});
    	AddMessage(msg);
	});
	socket.on('get members', function() {
		io.to(socket.id).emit('get members', members);
	});
	socket.on('get messages', function() {
		io.to(socket.id).emit('get messages', GetMessage());
	});
	socket.on('change name', function(cname) {
		/*for(let i = 0; i < m.length; i++) {
			if(m[i] == name[0]) {
				m[i] = name[1];
			}
		}*/
		members[cname[1]] = members[cname[0]];
		delete members[cname[0]];
		name = cname[1];
	});
	socket.on('marty ai', function(aiai) {
	const messages = [
		{ role: 'system', content: 'You are a MartyBot who is good at playing chess.' },
		{ role: 'user', content: aiai.replace(/<span>/g, '').replace(/<\/span>/g, '').replace(/<br>/g, '\n') },
	  ]
	  const config = {
		headers: {
		  Authorization: 'Bearer sk-****',
		  'Content-Type': 'application/json',
		},
	  }
	  const data = {
		model: 'gpt-3.5-turbo',
		temperature: 0.5,
		n: 1,
		messages: messages,
	  }
	  axios
		.post('https://api.openai.com/v1/chat/completions', data, config)
		.then(function (response) {
			io.to(socket.id).emit('marty ai', response.data.choices);
		  /*let resultDiv = document.getElementById('result')
		  resultDiv.innerHTML = ''
		  response.data.choices.forEach(function (choice, index) {
			choice.message.content
			  .split('\n')
			  .join('<br/>')
		  })*/
		})
		.catch(function (error) {
		  console.error(error);
		});
	});
});
http.listen(3000, function() {
	console.log('server on!');
});
console.log('server start!');