var React = require("react");

var MessageList = React.createClass({
	
	render(){
		var messages = this.props.messageList.map(function(item){
			return <li>{item}</li>
		})
		return (<ul>{messages}</ul>);
	}
});

module.exports = MessageList;