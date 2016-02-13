var React = require("react");

var app = React.createClass({
    render(){
        return (
            <div className="container-fluid">
                <div className="row">
                    <h2>Leoni checking cable system</h2>
                </div>
                <div className="row">
                    <h1>Current status</h1>
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