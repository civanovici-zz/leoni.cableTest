/**
 * Created by roduino on 2/13/2016.
 */

var express = require("express");

var app = express();

app.use(express.static("./public"));
app.use(express.static("./node_modules/bootstrap/dist"));

var server = app.listen(3000);

var io = require("socket.io").listen(server);
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
			console.log('results ' + results);
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
	var currentState = machineState.getCurrentState();
	if(currentState.arduinoCommands) {
		for(var i=0;i<currentState.arduinoCommands.length;i++) {
			console.log("executing arduino command:",currentState.arduinoCommands[i]);
			sp.write(currentState.arduinoCommands[i], function (err, results) {
				if (err) {
					console.log('err ' + err);
				}
				console.log('results ' + results + " for command: " + currentState.arduinoCommands[i]);
			});
		}
	}
}

function executeArduinoCommand(arduinoCommand){
	sp.write(arduinoCommand,function(err, results){
		if(err){
			console.log(err);
		}
		console.log("results "+results);
	})
}



/* */
var serialport = require("serialport");
//serialport.list(function (err, ports) {
//	ports.forEach(function(port) {
//		console.log(port.comName);
//		console.log(port.pnpId);
//		console.log(port.manufacturer);
//	});
//});


var SerialPort = serialport.SerialPort;
//var sp = new SerialPort("/dev/ttyAMA0", {
var sp = new SerialPort("COM7", {
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
   
    sp.write("ls\n", function(err, results) {
		if(err) {
			console.log('err ' + err);
		}
		console.log('results ' + results);
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
							machineState.stopCheckingCableHandler = setInterval(executeCurrentStateArduinoCommands,machineState.intervalToCheckCablleLeakCurrent);
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
				//console.log("current:",currentState,"next",nextState);
				if(currentState.nextState == nextState.key) {
					io.emit("machineStateChanged", {machineState: machineState.moveToNextState()});
					currentState = machineState.getCurrentState();
					if(currentState.name ==machineState.WAIT_TO_ATTACH_CABLE_STATE){
						machineState.stopCheckingCableHandler = setInterval(executeCurrentStateArduinoCommands,machineState.intervalToCheckCabllePresent);
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
					console.log("measure current:", eventValue);
					if(cableValue<50){
						//cable detached
						clearInterval(machineState.stopCheckingCableHandler);
						machineState.setCableDetachedState();
						return;
					}
					//nominal voltage = 5V
					//resitor = 150 ohm
					var current =((cableValue*5)/ 1024)/150;
					io.emit("currentMeasurement",{x:machineState.leakCurrentSample.length,y:current});
					machineState.leakCurrentSample.push(current);
					if(machineState.leakCurrentTotalSampleCount<machineState.leakCurrentSample.length){
						//stop sampling and do average
						//increment OK/NOK
						//getNextState
					}
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
				}else if(currentState.name == machineState.TEST_EXECUTION_STATE){
					console.log("measure current:", eventValue);
				}

				console.log("reading value",eventValue);
			break;
		default:
				console.log("Unknown event", eventName,eventValue);
			break;
	}
}




//var counter=0;
//mocking graph data
//setInterval(function(){
//	io.emit("currentMeasurement",{
//		x:counter+"",
//		y:Math.floor(Math.random() * 15) + 1
//	});
//	counter++;
//},500);
//setInterval(function(){
//	counter=0;
//	io.emit("currentMeasurement",{resetGraph:true});
//},10000);

function MachineState(){
	this.stopCheckingCableHandler=0; //variable to store setInterval handler
	this.intervalToCheckCabllePresent =500; //interval to check if cable are attached
	this.intervalToCheckCablleLeakCurrent =500; //interval to check if cable has leaks
	this.cablePresentCount = 0; //how many times are checking if cable are attached
	this.cablePresentMaxCount = 10; //how many times are checking if cable are attached
	this.microwaveTimeout = 5000;
	this.vaccumTimeout = 10000;
	this.leakCurrentSample=[]; //temp var for current samples
	this.leakCurrentTotalSampleCount = 10; //how many samples to measure


	this.EMERGENCY_STATE="EMERGENCY";
	this.UNKNOWN_STATE="unknown";
	this.MOVE_TO_START_POSITION_STATE = "moveToStartPosition";
	this.WAIT_TO_ATTACH_CABLE_STATE = "waitForCable";
	this.CABLE_ATTACHED_STATE = "cableAttached";
	this.MOVING_TO_TEST_POSITION_STATE = "movingToTestPosition";
	this.READY_FOR_TEST_STATE = "readyForTest";
	this.TEST_EXECUTION_STATE = "testExecution";
	this.CABLE_DETACHTED_IN_TEST_STATE = "cableDetachedInTest";

	this.states=[
		{
			key:0,
			name:this.EMERGENCY_STATE,
			messageToScreen:"EMERGENCY button pressed",
			startButtonDisabled:true,
			startButtonLabel:"START",
			arduinoCommands:["0"]
		},
		{
			key:1,
			name:this.UNKNOWN_STATE,
			messageToScreen:"Please press START",
			startButtonDisabled:false,
			startButtonLabel:"START",
			arduinoCommands:["0"]
		},
		{
			key:2,
			name:this.MOVE_TO_START_POSITION_STATE,
			messageToScreen:"Moving to START position",
			startButtonDisabled:true,
			startButtonLabel:"START",
			arduinoCommands:["1"],
			nextState:3
		},
		{
			key: 3,
			name: this.WAIT_TO_ATTACH_CABLE_STATE,
			messageToScreen:"Please attach the cable",
			startButtonDisabled:true,
			arduinoCommands:["8"],
			startButtonLabel:"START"
		},
		{
			key:4,
			name:this.CABLE_ATTACHED_STATE,
			messageToScreen:"Cable attached, please press START",
			startButtonDisabled:false,
			startButtonLabel:"START"
		},
		{
			key:5,
			name:this.MOVING_TO_TEST_POSITION_STATE,
			messageToScreen:"Moving to test position",
			startButtonDisabled:true,
			arduinoCommands:["2","8"],
			startButtonLabel:"WAIT",
			nextState:6
		},
		{
			key:6,
			name:this.READY_FOR_TEST_STATE,
			messageToScreen:"Ready for test",
			startButtonDisabled:true,
			arduinoCommands:["0","3","5"],
			startButtonLabel:"WAIT",
			nextState:7
		},
		{
			key:7,
			name:this.TEST_EXECUTION_STATE,
			messageToScreen:"Test execution",
			startButtonDisabled:true,
			startButtonLabel:"WAIT",
			arduinoCommands:["7"]
		},
		{
			key:50,
			name:this.CABLE_DETACHTED_IN_TEST_STATE,
			startButtonDisabled:false,
			messageToScreen:"Cable detached, please press START",
			arduinoCommand:[0],
			startButtonLabel:"START"
		}
	];
	this.currentState = this.states[0];
}

MachineState.prototype.getCurrentState= function(){
	return this.currentState;
};

MachineState.prototype.resetInternalState = function(){
	var me=this;
	clearInterval(me.stopCheckingCableHandler);
	me.cablePresentCount =0;
	me.leakCurrentSampleCount=0;
};
MachineState.prototype.setUndefinedState = function(){
	this.currentState = this.states[1];
	this.resetInternalState();
};

MachineState.prototype.setCableDetachedState = function(){
	this.currentState=this.getStateByKey(50);
	this.resetInternalState();
};

MachineState.prototype.setEmergencyState = function(){
	this.currentState = this.states[0];
	this.resetInternalState();
};

MachineState.prototype.getPreviousState = function(){
	var states= this.states.sort(function(a,b){
		return a.key - b.key;
	});
	for(var i=0; i<states.length;i++){
		if(states[i].key==this.getCurrentState().key) {
			newState = states[i - 1];
			return newState;
		}
	}
};
MachineState.prototype.getNextState = function(){
	var states= this.states.sort(function(a,b){
		return a.key - b.key;
	});
	var newState;
	for(var i=0; i<states.length;i++){
		if(states[i].key==this.getCurrentState().key) {
			newState = states[i + 1];
			//this.currentState=newState;
			return newState;
		}
	}
};

MachineState.prototype.moveToNextState = function(){
	var states= this.states.sort(function(a,b){
		return a.key - b.key;
	});
	for(var i=0; i<states.length;i++){
		if(states[i].key==this.getCurrentState().key) {
			var newState = states[i + 1];
			this.currentState=newState;
			return newState;
		}
	}
};

MachineState.prototype.getStateByKey = function(key){
	for(var i=0;i<this.states.length;i++){
		if(this.states[i].key == key)
			return this.states[i];
	}

	return this.states[0];
};

console.log("server running on port 3000");