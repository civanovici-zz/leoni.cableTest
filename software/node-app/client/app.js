var React = require("react");
var io = require("socket.io-client");
var MessageList = require("./messageList");
var Graph = require("./graph");

var app = React.createClass({
	getInitialState(){
		return {
			status:"disconnected",
			batch:"none",
            messageList:[],
            graphData:[{
                label: 'a',
                values: [
                    {x:"0",y:0}
                ]
            }],
            startButtonDisabled:true,
            startButtonLabel:"START",
            microwaveState:"btn-info",
            vaccumState:"btn-info"
		}
	},
	
	componentWillMount (){
		this.socket = io("http://localhost:3000");
		this.socket.on("connect", this.connect);
		this.socket.on("disconnect", this.disconnect);
		this.socket.on("batchCange", this.batchChange);
		this.socket.on("infoMessage", this.infoMessage);
		this.socket.on("microwaveState", this.microwaveState);
		this.socket.on("vaccumState", this.vaccumState);
		this.socket.on("machineStateChanged", this.machineStateChanged);
		this.socket.on("currentMeasurement", this.currentMeasurement);
	},
	
	connect(){
		this.setState({status:"Connected"});
	},

	disconnect(){
		this.setState({
            status: "Disconnected",
            startButtonDisabled:true
        });
	},

    microwaveState(serverState){
        var msgList = this.state.messageList;
        msgList.push(serverState.microwaveState == true ? "microwave on" : "microwave off");
        this.setState({
            microwaveState:serverState.microwaveState == true ? "btn-danger" : "btn-info",
            messageList:msgList
        })
    },

    vaccumState(serverState){
        var msgList = this.state.messageList;
        msgList.push(serverState.vaccumState == true ? "vaccum on" : "vaccum off");

        this.setState({
            vaccumState:serverState.vaccumState == true ? "btn-danger" : "btn-info",
            messageList:msgList
        })
    },

	batchChange(serverState){
		console.log(serverState);
		this.setState({
			batch:serverState.batch
		});
	},

    infoMessage(serverState){
        var msgList = this.state.messageList;
        if(serverState.resetMessageList){
            msgList = [];
        }else {
            msgList.push(serverState.newMessage);
        }
        this.setState({
          messageList:msgList
      })
    },

    machineStateChanged(serverData){
        this.setState({
            status:serverData.machineState.messageToScreen,
            startButtonDisabled:serverData.machineState.startButtonDisabled,
            startButtonLabel:serverData.machineState.startButtonLabel
        });

        var msgList = this.state.messageList;
        if(serverData.resetMessageList){
            msgList = [];
        }else {
            msgList.push(serverData.machineState.name+"-"+serverData.machineState.messageToScreen);
        }
        this.setState({
            messageList:msgList
        });
        console.log("machine state changed",serverData);
    },

    currentMeasurement(serverState){
        var tmp = this.state.graphData;
        if(serverState.resetGraph == true) {
            tmp[0].values.length=0;
        }else{
            var newValue = {
                x: serverState.x,
                y: serverState.y
            }
            tmp[0].values.push(newValue);
        }
        this.setState({
            graphData:tmp
        })
    },

    start:function(e){
        console.log("click on start");
        this.socket.emit("start");
        this.setState({
            startButtonDisabled:true
        });
    },

    print:function(e){
        this.socket.emit("print");
    },

    stop:function(){
        this.socket.emit("stop");
        this.setState({
            startButtonDisabled:false
        });
    },

    render(){
        return (
            <div className="container-fluid">
                <div className="row">
                    <h2>Leoni checking cable system</h2>
                </div>
                <div className="row">
					<div className="col-xs-6">
						<h3>{this.state.status}</h3>
					</div>
					<div className="col-xs-6">
						<h3>Batch {this.state.batch}</h3>
					</div>
                </div>
                <div className="row">
                    <div id="graph" className="col-xs-8">
                        <Graph graphData={this.state.graphData}/>
                    </div>
                    <div className="col-xs-4">
                        <div>
                            <a className="btn btn-danger btn-block"> scanner status</a>
                            <a className="btn btn-danger  btn-block"> printer status</a>
                            <a className="btn btn-info  btn-block"> vaccum status</a>
                            <a className="btn btn-info  btn-block"> microwave status</a>
                        </div>
                        <div id="logger-container">
                            <MessageList messageList={this.state.messageList}/>
                        </div>
                    </div>
                </div>

                <div id="toolbar" className="row">
                    <div className="col-xs-1"></div>
                    <input type="button" className="col-xs-2 btn btn-primary btn-lg" disabled={this.state.startButtonDisabled} onClick={this.start}
                           value={this.state.startButtonLabel}/>
                    <div className="col-xs-2"></div>
                    <input type="button" className="col-xs-2 btn btn-primary btn-lg" onClick={this.stop} value="STOP"/>
                    <div className="col-xs-2"></div>
                    <input type="button" className="col-xs-2 btn btn-primary btn-lg" onClick={this.print} value="PRINT"/>
                    <div className="col-xs-1"></div>
                </div>
            </div>
        );
    }
});

module.exports = app;