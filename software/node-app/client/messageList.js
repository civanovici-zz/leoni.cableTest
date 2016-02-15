var React = require("react");
var ReactDom = require("react-dom");

var messageList = ReactDom.createClass({
	
	render(){
		var messages = this.props.messageList.map(function(item){
			return <li>{item.text}</li>
		})
		return (<ul>{messages)</ul>);
	}
});