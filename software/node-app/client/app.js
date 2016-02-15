var React = require("react");
var ReactDom = require("react-dom");
var io = require("socket.io-client");
var messageList = require("messageList");

var app = ReactDom.createClass({
	getInitialState(){
		return {
			status:"disconnected",
			batch:"none"
		}
	},
	
	componentWillMount (){
		this.socket = io("http://localhost:3000");
		this.socket.on("connect", this.connect);
		this.socket.on("disconnect", this.disconnect);
		this.socket.on("batchCange", this.batchCange);
	},
	
	connect(){
		this.setState({status:"Connected"});
	},

	disconnect(){
		this.setState({status: "Disconnected"});
	},

	batchCange(serverState){
		console.log(serverState);
		this.setState({
			batch:serverState.batch
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
						<h3>STATUS {this.state.status}</h3>
					</div>
					<div className="col-xs-6">
						<h3>Batch {this.state.batch}</h3>
					</div>
                </div>
                <div className="row">
                    <div id="graph" className="col-xs-8">
                        graph go here
                    </div>
                    <div className="col-xs-4">
                        <div>
                            <a className="btn btn-danger btn-block"> scanner status</a>
                            <a className="btn btn-danger  btn-block"> printer status</a>
                            <a className="btn btn-info  btn-block"> vaccum status</a>
                            <a className="btn btn-info  btn-block"> microwave status</a>
                        </div>
                        <div id="logger-container">loging go here</div>
                    </div>
                </div>

                <div id="toolbar" className="row">
                    <div className="col-xs-1"></div>
                    <input type="button" className="col-xs-2 btn btn-primary btn-lg" value="START"/>
                    <div className="col-xs-2"></div>
                    <input type="button" className="col-xs-2 btn btn-primary btn-lg" value="STOP"/>
                    <div className="col-xs-2"></div>
                    <input type="button" className="col-xs-2 btn btn-primary btn-lg" value="PRINT"/>
                    <div className="col-xs-1"></div>
                </div>
            </div>
        );
    }
});

module.exports = app;