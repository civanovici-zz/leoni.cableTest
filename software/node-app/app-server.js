/**
 * Created by roduino on 2/13/2016.
 */
 
var express = require("express");
var fs = require('fs');
var app = express();
var printer = require("printer");
var util = require('util');
var htmlToPdf = require('html-to-pdf');
var bwipjs = require('bwip-js');

app.use(express.static("./public"));
app.use(express.static("./node_modules/bootstrap/dist"));

var server = app.listen(3000);

var io = require("socket.io").listen(server);
var MachineState = require("./server/machineState");
var machineState = new MachineState();
var comName="/dev/ttyACM0";

io.sockets.on("connect",function(socket){
	detectArduinoPort();
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
		printLabel();
		/*
		sp.write("2", function(err, results) {
			if(err) {
				console.log('err ' + err);
			}
		});
		*/
	});

	socket.on("stop",function(){
		console.log("--->click on stop");
		console.log("status:", sp.isOpen());
		if(sp.isOpen()!=true){
			console.log("try to open port arduino");
			detectArduinoPort(function(){
				console.log("reopen port",comName);
				sp = new SerialPort(comName, {
				//var sp = new SerialPort("COM7", {
				  baudrate: 9600,
					parser: serialport.parsers.readline("\n")
				}, false); // this is the openImmediately flag [default is true]
				sp.open(openSerialPort);
				setTimeout(function(){
					stopMachine();
				},500);
			});
			
		}else{
			stopMachine();
			console.log("stopping machine");
		}
	});
/*
	setTimeout(function(){
			io.emit("batchChange",{
				batch:"3345789"
			});
		},5000
	);
*/
	console.log("Connected  sockets");
});

function executeCurrentStateArduinoCommands(){
	var currentState = machineState.getCurrentState();
	console.log("execute arduino commands",currentState);
	if(currentState == undefined){
		console.log("trying to execute undefined state");
		return;
	}
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

function stopMachine(){
	machineState.setUndefinedState();
	var currentState = machineState.getCurrentState();
	io.emit("infoMessage",{resetMessageList:true});
	io.emit("machineStateChanged",{machineState:currentState});
	executeCurrentStateArduinoCommands();	
}

/* */
var serialport = require("serialport");
/* */

function detectArduinoPort(callback){
	serialport.list(function (err, ports) {
		ports.forEach(function(port) {
			if(port.manufacturer){
				if(port.manufacturer.indexOf("Arduino")>-1){
					comName=port.comName;
					console.log("arduino found");
					if(callback){
						console.log("calback...",comName);
						callback();
					}
					return;
				}
			}
			console.log(port.comName);
			console.log(port.pnpId);
			console.log(port.manufacturer);
		});
	});
}


var SerialPort = serialport.SerialPort;
var sp = new SerialPort(comName, {
//var sp = new SerialPort("COM7", {
  baudrate: 9600,
	parser: serialport.parsers.readline("\n")
}, false); // this is the openImmediately flag [default is true]

sp.open(openSerialPort);

function openSerialPort(error){
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
}



sp.on('data', function(data) {
	console.log('data from arduino: ' , data.toString());
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
					if(cableValue==1){
						//cable detached
						clearInterval(machineState.stopCurrentLeakeageHandler);
						currentState = machineState.setCableDetachedState();
						executeCurrentStateArduinoCommands();
						io.emit("machineStateChanged",{machineState:currentState});
						return;
					}
					//nominal voltage = 5V
					//resitor = 150 ohm
					var current =eventValue;//((cableValue*5)/ 1024)/150*1000;
					io.emit("infoMessage",{newMessage:"current: "+current});
					var graphValue=0;
					if(current<-500){
						graphValue = -1*current;
					}
					io.emit("currentMeasurement",{x:machineState.leakCurrentSample.length,y:graphValue});
					machineState.leakCurrentSample.push(current);
					if(machineState.leakCurrentTotalSampleCount<machineState.leakCurrentSample.length){
						console.log("-------------stop sampling!");
						//stop sampling and do average
						var totalCurrent=0;
						for(var i=0;i<machineState.leakCurrentSample.length;i++){
							var tmpValue = parseInt(machineState.leakCurrentSample[i]);
							if( isNaN(tmpValue)){
								
							}else{
								totalCurrent+=tmpValue;
							}
							console.log("measure:", machineState.leakCurrentSample[i]);
						}
						var averageCurrent = totalCurrent/machineState.leakCurrentSample.length;
						console.log("average:",averageCurrent,totalCurrent);
						//getNextState
						currentState = machineState.moveToNextState();
						

						//increment OK/NOK
						if(averageCurrent>-300){
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
					if(eventValue==0){
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
					if(eventValue==1){
						clearInterval(machineState.stopCheckingCableHandler);
						machineState.setCableDetachedState();
						currentState = machineState.getCurrentState();
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
//console.log("devices",connectedHidDevices,"end devices");

//initialize new usbScanner - takes optional parmeters vendorId and hidMap - check source for details
var scanner = new usbScanner({vendorId:3727});

//scanner emits a data event once a barcode has been read and parsed
scanner.on("data", function(code){
    console.log("recieved code : " + code.toString());
	io.emit("batchChange",{batch:code.toString()});
	io.emit("infoMessage",{bingo:"merge"});
	console.log("batchChange");
	//io.emit("machineStateChanged",{machineState:currentState});
	machineState.batch = code;
	console.log("new batch",machineState.batch);
});

/******************************************/

function printLabel(){
	generateBarcode(function(){
		generateHtml(function(){
			generatePDF(function(){
				printToFile();
				machineState.salmpleNOK = 0;
				machineState.salmpleOK = 0;
				io.emit("incrementOK",{totalOK:machineState.salmpleOK});
				io.emit("incrementNOK",{totalNOK:machineState.salmpleNOK});
			});
		});
	});
}

printToFile = function(callback){
	io.emit("infoMessage",{newMessage:"printing ..."});
	printer.printDirect({data:fs.readFileSync("label.pdf"),
		type: 'PDF',
		success:function(jobID){
			console.log("--sent to printer with ID: "+jobID);
		},
		error:function(err){
			console.log("error printing",err);
		}
	});
}
/******************************************/

/****************barCode ******************/
var barcodeArguments = {
		bcid:			'code128',		// Barcode type 
		text:			machineState.batch,	// Text to encode 
		scale:			2,				// 3x scaling factor 
		height:			6,				// Bar height, in millimeters 
		includetext:	true,			// Show human-readable text 
		textxalign:		'center',		// Always good to set this 
		textfont:		'Inconsolata',	// Use your custom font 
		textsize:		12				// Font size, in points 
	};
	
// Optionally load some custom fonts.  Maximum 8. 
// OpenType and TrueType are supported. 
//bwipjs.loadFont('Inconsolata', 108,
//            require('fs').readFileSync('./node_modules/bwipp/Inconsolata.otf', 'binary'));

generateBarcode = function(callback){
	barcodeArguments.text = machineState.batch || "00000";
	barcodeArguments.bcid = 'code128';
	io.emit("infoMessage",{newMessage:"generating barcode ..."});
	bwipjs.toBuffer(barcodeArguments, function (err, png) {
		if (err) {
			// Decide how to handle the error 
			// `err` may be a string or Error object 
			console.log("error generating barcode",err);
			io.emit("infoMessage",{newMessage:"ERROR generating barcode"});
		} else {
					
			fs.writeFile("barcode.png", png, function(err1) {
				if(err1) {
					return console.log(err);
				}
				console.log("--barcode.png file generated");	
				io.emit("infoMessage",{newMessage:"Done generating barcode"});
				if(callback)
					callback();
			});
		}
	});
};

/******************************************/

/****************generate PDF *************/
generatePDF = function(callback){
	io.emit("infoMessage",{newMessage:"generating PDF ..."});
	htmlToPdf.convertHTMLFile('print.html', 'label.pdf',
		function (error, success) {
		   if (error) {
				console.log('Oh noes! Errorz!');
				console.log(error);
			} else {
				console.log('Woot! Success!');
				console.log(success);
				io.emit("infoMessage",{newMessage:"Done generating PDF"});
			}
			if(callback)
				callback();
		}
	);
}
/******************************************/

/****************generate HTML ************/
generateHtml = function(callback){
	io.emit("infoMessage",{newMessage:"generating HTML ..."});
	var d = new Date();
	var nDate = d.toDateString();
	var nTime = d.toLocaleTimeString();
	var total = machineState.salmpleOK+machineState.salmpleNOK;
	var html="<!DOCTYPE html><html><body style='height:200px;width:230px;'><img src='barcode.png'/>"
	html+="<span>"+machineState.batch+"</span>";
	html+="<h4>";
	html+= "<span>OK: "+machineState.salmpleOK+"</span>";
	html+="<span>&nbsp; NOK: "+ machineState.salmpleNOK+"</span><span>&nbsp;TOTAL: "+total+"</span>";
	//html+="<span>  TOTAL: "+total+"</span>";
	html+="</br><span>"+nDate+" "+nTime+"</span>"
	html+="</h4></body></html>";
	fs.writeFile("/home/pi/leoni/leoni.cableTest/software/node-app/print.html", html, function(err1) {
		if(err1) {
			console.log(err1);
		}
		console.log("--html generated");	
		io.emit("infoMessage",{newMessage:"Done generating html"});
		if(callback)
			callback();
	});
}
/******************************************/


console.log("server running on port 3000");
