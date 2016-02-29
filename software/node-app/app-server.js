/**
 * Created by roduino on 2/13/2016.
 */
 
var express = require("express");

var app = express();

app.use(express.static("./public"));
app.use(express.static("./node_modules/bootstrap/dist"));

var server = app.listen(3000);

var io = require("socket.io").listen(server);
var MachineState = require("./server/machineState");
var machineState = new MachineState();


io.sockets.on("connect",function(socket){

	io.emit("infoMessage",{newMessage:"connection open to arduino"});
	socket.once("disconnect",function(){
		socket.disconnect();
		console.log("Connections close ");
	});

	socket.on("start",function() {
		console.log("click on start");
		var currentState = machineState.moveToNextState();
		io.emit("machineStateChanged",{machineState:currentState});
		executeCurrentStateArduinoCommands();
	});

	socket.on("print",function(){
		console.log("click on print ...");
		sp.write("2", function(err, results) {
			if(err) {
				console.log('err ' + err);
			}
			//console.log('results ' + results);
		});
	});

	socket.on("stop",function(){
		console.log("click on stop");
		machineState.setUndefinedState();
		var currentState = machineState.getCurrentState();
		io.emit("infoMessage",{resetMessageList:true});
		io.emit("machineStateChanged",{machineState:currentState});
		executeCurrentStateArduinoCommands();
	});

	//setTimeout(function(){
	//		socket.emit("batchCange",{
	//			batch:"3345789"
	//		});
	//	},5000
	//);

	console.log("Connected  sockets");
});

function executeCurrentStateArduinoCommands(){
	console.log("execute arduino commands");
	var currentState = machineState.getCurrentState();
	if(currentState.arduinoCommands) {
		for(var i=0;i<currentState.arduinoCommands.length;i++) {
			console.log("executing arduino command:",currentState.arduinoCommands[i]);
			sp.write(currentState.arduinoCommands[i], function (err, results) {
				if (err) {
					console.log('err ' + err);
				}
			});
		}
	}
}

function executeArduinoCommand(arduinoCommand){
	sp.write(arduinoCommand,function(err, results){
		if(err){
			console.log(err);
		}
	})
}



/* */
var serialport = require("serialport");
serialport.list(function (err, ports) {
	ports.forEach(function(port) {
		console.log(port.comName);
		console.log(port.pnpId);
		console.log(port.manufacturer);
	});
});


var SerialPort = serialport.SerialPort;
var sp = new SerialPort("/dev/ttyACM0", {
//var sp = new SerialPort("COM7", {
  baudrate: 9600,
	parser: serialport.parsers.readline("\n")
}, false); // this is the openImmediately flag [default is true]

sp.open(function (error) {
  if ( error ) {
    console.log('failed to open: '+error);
  } else {
    console.log('arduino serial open');
	machineState.setUndefinedState();
	var state = machineState.getCurrentState();
	console.log("after start", state);
	io.emit("machineStateChanged",{machineState:state});
   
    sp.write("9", function(err, results) {
		if(err) {
			console.log('err ' + err);
		}
		console.log("arduino response:",results);
    });
  }
});
sp.on('data', function(data) {
	console.log('data received: ' , data.toString());
	data=data.toString();
	var param= data.split(":");
	if(param[0] == "EVENT"){
		handleArduinoEvent(param);
	}
	//var command=param[1];
	//if(command == undefined) return;
});


function handleArduinoEvent(parameters){
	var eventName=parameters[1];
	var eventValue = parameters[2];
	var currentState;
	var nextState;
	switch (eventName){
		case "LIMIT_SWITCH":
				var topLimit = eventValue;
				var bottomLimit = parameters[3];
				console.log("limit switch: ", topLimit,bottomLimit);
				currentState = machineState.getCurrentState();
				if(topLimit ==0 && currentState.name == machineState.MOVE_TO_START_POSITION_STATE){
					io.emit("machineStateChanged", {machineState: machineState.moveToNextState()});
					currentState = machineState.getCurrentState();
					if(currentState.name ==machineState.WAIT_TO_ATTACH_CABLE_STATE){
						machineState.stopCheckingCableHandler = setInterval(executeCurrentStateArduinoCommands,machineState.intervalToCheckCabllePresent);
					}
				}
			break;
		case "BOTTOM_LIMIT":
				currentState = machineState.getCurrentState();
				nextState = machineState.getNextState();
				//console.log("current:",currentState,"next",nextState);
				if(currentState.nextState == nextState.key) {
					io.emit("machineStateChanged", {machineState: machineState.moveToNextState()});
					currentState=machineState.getCurrentState();
					if(currentState.name==machineState.READY_FOR_TEST_STATE){
						executeCurrentStateArduinoCommands();
						io.emit("vaccumState",{vaccumState:true});
						io.emit("microwaveState",{microwaveState:true});
						setTimeout(function(){
							currentState = machineState.moveToNextState();
							machineState.stopCurrentLeakeageHandler = setInterval(executeCurrentStateArduinoCommands,machineState.intervalToCheckCablleLeakCurrent);
						},machineState.vaccumTimeout);

						setTimeout(function(){
							executeArduinoCommand("6");
							io.emit("microwaveState",{microwaveState:false});
						},machineState.microwaveTimeout);
					}
				}
			break;
		case "TOP_LIMIT":
				currentState = machineState.getCurrentState();
				nextState = machineState.getNextState();
				console.log("TOP_LIMIT current:",currentState,"next",nextState);
				if(currentState.nextState == nextState.key) {
					currentState = machineState.moveToNextState();
					io.emit("machineStateChanged", {machineState: currentState});
					if(currentState.name ==machineState.WAIT_TO_ATTACH_CABLE_STATE){
						machineState.stopCheckingCableHandler = setInterval(executeCurrentStateArduinoCommands,machineState.intervalToCheckCabllePresent);
					}else if(currentState.name == machineState.WAIT_FOR_NEW_TEST){
						io.emit("infoMessage",{resetMessageList:true});
						machineState.resetForNewTest();
					}
				}
			break;
		case "EMERGENCY":
				if(eventValue==1){
					machineState.setEmergencyState();
				}else{
					machineState.setUndefinedState();
				}
				state = machineState.getCurrentState();
				io.emit("machineStateChanged",{machineState:state});
			break;
		case "LEAK_CURRENT":
				currentState = machineState.getCurrentState();
				if(currentState.name == machineState.TEST_EXECUTION_STATE){
					var cableValue = parameters[3];
					console.log("--------measure current:", eventValue,cableValue);
					if(cableValue<50){
						//cable detached
						clearInterval(machineState.stopCurrentLeakeageHandler);
						currentState = machineState.setCableDetachedState();
						executeCurrentStateArduinoCommands();
						io.emit("machineStateChanged",{machineState:currentState});
						return;
					}
					//nominal voltage = 5V
					//resitor = 150 ohm
					var current =((cableValue*5)/ 1024)/150*1000;
					io.emit("infoMessage",{newMessage:"current: "+current});
					io.emit("currentMeasurement",{x:machineState.leakCurrentSample.length,y:current});
					machineState.leakCurrentSample.push(current);
					if(machineState.leakCurrentTotalSampleCount<machineState.leakCurrentSample.length){
						console.log("-------------stop sampling!");
						//stop sampling and do average
						var totalCurrent=0;
						for(var i=0;i<machineState.leakCurrentSample.length;i++){
							totalCurrent+=machineState.leakCurrentSample[i];
						}
						var averageCurrent = totalCurrent/machineState.leakCurrentSample.length;
						//getNextState
						currentState = machineState.moveToNextState();

						//increment OK/NOK
						if(averageCurrent<1){
							machineState.salmpleOK++;
							currentState.messageToScreen="TEST PASS";
						}else{
							machineState.salmpleNOK++;
							currentState.messageToScreen="TEST FAIL";
						}
						io.emit("incrementOK",{totalOK:machineState.salmpleOK});
						io.emit("incrementNOK",{totalNOK:machineState.salmpleNOK});
						io.emit("machineStateChanged",{machineState:currentState});
						clearInterval(machineState.stopCurrentLeakeageHandler);
						executeCurrentStateArduinoCommands();
						return;
					}
					console.log("samples count:"+machineState.leakCurrentSample.length,machineState.leakCurrentTotalSampleCount);
				}
			break;
		case "CABLE_CONNECTION":
				currentState = machineState.getCurrentState();
				if(currentState.name == machineState.WAIT_TO_ATTACH_CABLE_STATE){
					if(eventValue>50){
						machineState.cablePresentCount++;
					}else{
						machineState.cablePresentCount=0;
					}
					if(machineState.cablePresentCount>machineState.cablePresentMaxCount){
						clearInterval(machineState.stopCheckingCableHandler);
						currentState= machineState.moveToNextState();
						io.emit("machineStateChanged",{machineState:currentState});

					}
				}else if(currentState.name==machineState.MOVING_TO_TEST_POSITION_STATE){
					if(eventValue<50){
						clearInterval(machineState.stopCheckingCableHandler);
						machineState.setCableDetachedState();
						currentState = machineState.moveToNextState();
						io.emit("machineStateChanged",{machineState:currentState});
						executeArduinoCommand(currentState.arduinoCommands[0]);
					}
				}

				console.log("reading value",eventValue);
			break;
		default:
				console.log("Unknown event", eventName,eventValue);
			break;
	}
}


/************** scanner code *****************/
var usbScanner = require('./node_modules/node-usb-barcode-scanner/usbscanner').usbScanner;
var getDevices = require('./node_modules/node-usb-barcode-scanner/usbscanner').getDevices;

//get array of attached HID devices
var connectedHidDevices = getDevices();

//print devices
console.log("devices",connectedHidDevices,"end devices");

//initialize new usbScanner - takes optional parmeters vendorId and hidMap - check source for details
var scanner = new usbScanner({vendorId:3727});

//scanner emits a data event once a barcode has been read and parsed
scanner.on("data", function(code){
    console.log("recieved code : " + code);
});

/******************************************/



console.log("server running on port 3000");
