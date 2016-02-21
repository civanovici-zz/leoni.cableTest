/**
 * Created by roduino on 2/13/2016.
 */

var express = require("express");

var app = express();

app.use(express.static("./public"));
app.use(express.static("./node_modules/bootstrap/dist"));

var server = app.listen(3000);

var io = require("socket.io").listen(server);
var MachineState = require("./server/MachineState");
var machineState = new MachineState();

/* */
var serialport = require("serialport");
//serialport.list(function (err, ports) {
//	ports.forEach(function(port) {
//		console.log(port.comName);
//		console.log(port.pnpId);
//		console.log(port.manufacturer);
//	});
//});

//var arduinoSerial = require("./server/arduino-serial");

//var serialport = require("serialport");

//
var SerialPort = serialport.SerialPort
//var sp = new SerialPort("/dev/ttyAMA0", {
var sp = new SerialPort("COM8", {
  baudrate: 9600,
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
	console.log('data received: ' , data.toString());
});


io.sockets.on("connect",function(socket){


    socket.once("disconnect",function(){
        socket.disconnect();
        console.log("Connections close ");
    });

	socket.on("start",function() {
		console.log("click on start");
		sp.write("1", function(err, results) {
			if(err) {
				console.log('err ' + err);
			}
			console.log('results ' + results);
		});

	});

	socket.on("print",function(){
		console.log("click on print ...");
		sp.write("2", function(err, results) {
			if(err) {
				console.log('err ' + err);
			}
			console.log('results ' + results);
		});
	});

	socket.on("stop",function(){
		console.log("click on stop");
		sp.write("0", function(err, results) {
			if(err) {
				console.log('err ' + err);
			}
			console.log('results ' + results);
		});
	});



	//setTimeout(function(){
	//		socket.emit("batchCange",{
	//			batch:"3345789"
	//		});
	//	},5000
	//);

    console.log("Connected  sockets");
});




var counter=0;
//mocking graph data
setInterval(function(){
	io.emit("currentMeasurement",{
		x:counter+"",
		y:Math.floor(Math.random() * 15) + 1
	});
	counter++;
},500);
setInterval(function(){
	counter=0;
	io.emit("currentMeasurement",{resetGraph:true});
},10000);

console.log("server running on port 3000");