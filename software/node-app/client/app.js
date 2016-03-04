var React = require("react");
var io = require("socket.io-client");
var MessageList = require("./messageList");
var Graph = require("./graph");

var app = React.createClass({
	getInitialState(){
		return {
			status:"disconnected",
			batch:"none",
            messageList:"",
            graphData:[{
                label: 'a',
                values: [
                    {x:"0",y:0}
                ]
            }],
            startButtonDisabled:true,
            startButtonLabel:"START",
            microwaveState:"btn-info",
            vaccumState:"btn-info",
            totalOK:3,
            totalNOK:2
		}
	},
	
	componentWillMount (){
		this.socket = io("http://192.168.5.103:3000");
		this.socket.on("connect", this.connect);
		this.socket.on("incrementOK", this.incrementOK);
		this.socket.on("incrementNOK", this.incrementNOK);
		this.socket.on("disconnect", this.disconnect);
		this.socket.on("batchChange", this.batchChange);
		this.socket.on("infoMessage", this.infoMessage);
		this.socket.on("microwaveState", this.microwaveState);
		this.socket.on("vaccumState", this.vaccumState);
		this.socket.on("machineStateChanged", this.machineStateChanged);
		this.socket.on("currentMeasurement", this.currentMeasurement);
	},

    microwaveState(){},
    vaccumState(){},
	connect(){
		this.setState({status:"Connected"});
	},

	disconnect(){
		this.setState({
            status: "Disconnected",
            startButtonDisabled:true
        });
	},

	batchChange(serverState){
		console.log("--->",serverState);
		this.setState({
			batch:serverState.batch
		});
	},

    infoMessage(serverState){
		console.log("info:", serverState);
        var msgList = this.state.messageList;
        if(serverState.resetMessageList){
            msgList = "";
        }else {
            msgList= serverState.newMessage;
        }
        this.setState({
          messageList:msgList
      })
    },

    machineStateChanged(serverData){
        if(serverData == undefined) return;
        this.setState({
            startButtonDisabled:serverData.machineState.startButtonDisabled,
            startButtonLabel:serverData.machineState.startButtonLabel
        });
        if(serverData.machineState.messageToScreen){
            this.setState({
                status:serverData.machineState.messageToScreen
            });
        }
        if(serverData.machineState.resetGraph){
            this.setState({
                graphData:[{
                    label: 'a',
                    values: [
                        {x:"0",y:0}
                    ]
                }]
            })
        }

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

    incrementNOK:function(serverData){
        this.setState({
            totalNOK:serverData.totalNOK
        });
    },

    incrementOK:function(serverData){
        this.setState({
            totalOK:serverData.totalOK
        });
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
                        <div className="row">
                            <input type="button" className="col-xs-8 btn btn-primary btn-lg action-button" disabled={this.state.startButtonDisabled} onClick={this.start}
                                   value={this.state.startButtonLabel}/>
                            <br/>
                        </div>
                        <div className="row">
                            <input type="button" className="col-xs-8 btn btn-primary btn-lg action-button" onClick={this.stop} value="STOP"/>
                            <br/>
                        </div>
                        <div className="row">
                            <input type="button" id="printBtn" className="col-xs-8 btn btn-primary btn-lg action-button" onClick={this.print} value="PRINT"/>
                            <br/>
                        </div>
                    </div>
                </div>
                <div className="row">
                    <div className="col-xs-4">
                        <h3>Total OK</h3>
                    </div>
                    <div className="col-xs-2">
                        <h3>{this.state.totalOK}</h3>
                    </div>
                    <div className="col-xs-4 redClass">
                        <h3>Total NOK</h3>
                    </div>
                    <div className="col-xs-2 redClass">
                        <h3>{this.state.totalNOK}</h3>
                    </div>
                </div>
				<div className="row">
					<span className="col-xs-12">{this.state.messageList}</span>
				</div>
            </div>
        );
    }
});

module.exports = app;