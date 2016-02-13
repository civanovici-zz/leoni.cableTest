/**
 * Created by roduino on 2/13/2016.
 */

var express = require("express");

var app = express();

app.use(express.static("./public"));
app.use(express.static("./node_modules/bootstrap/dist"));

var server = app.listen(3000);

var io = require("socket.io").listen(server);

io.sockets.on("connect",function(socket){

    connections.push(socket);

    socket.once("disconnect",function(){
        connections.splice(connections.indexOf(socket),1);
        socket.disconnect();
        console.log("Connections open %s",connections.length);
    });

    socket.emit("welcome",{
        title:title
    });

    console.log("Connected %s sockets",connections.length);
});

console.log("server running on port 3000");