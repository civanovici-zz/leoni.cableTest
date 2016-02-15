/**
 * Created by roduino on 2/13/2016.
 */

var express = require("express");

var app = express();

app.use(express.static("./public"));
app.use(express.static("./node_modules/bootstrap/dist"));

var server = app.listen(3000);

var io = require("socket.io").listen(server);

var arduinoSerial = require("./server/arduino-serial");

var serialport = require("serialport");
var SerialPort = serialport.SerialPort
var sp = new SerialPort("/dev/ttyAMA0", {
  baudrate: 57600,
  parser: serialport.parsers.readline("\n")
}, false); // this is the openImmediately flag [default is true]

sp.open(function (error) {
  if ( error ) {
    console.log('failed to open: '+error);
  } else {
    console.log('arduino serial open');
	io.emit("SerialPort",{isOpen:true});
   
    sp.write("ls\n", function(err, results) {
      console.log('err ' + err);
      console.log('results ' + results);
    });
  }
});
sp.on('data', function(data) {
	console.log('data received: ' + data);
});


io.sockets.on("connect",function(socket){


    socket.once("disconnect",function(){
        socket.disconnect();
        console.log("Connections close ");
    });

	setTimeout(function(){
			socket.emit("batchCange",{
				batch:"3345789"
			});
		},5000
	);

    console.log("Connected  sockets");
});

console.log("server running on port 3000");