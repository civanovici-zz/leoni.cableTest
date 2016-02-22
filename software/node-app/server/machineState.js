/**
 * Created by roduino on 2/16/2016.
 */

var util         = require("util");
var EventEmitter = require("events").EventEmitter;


function MachineState(){
    EventEmitter.call(this);
    this.states=[
        {key:1,name:"unknown"},
        {key:0,name:"emergency"},
        {key:2,name:"move to home"}
    ];
    this.currentState = this.states[0];
};

MachineState.prototype.getCurrentState= function(){
    return this.currentState;
};

MachineState.prototype.setUndefinedState = function(){
    this.currentState = this.states[1];
};

MachineState.prototype.getNextState = function(){
    var states= this.states.sort(function(a,b){
        return a.key - b.key;
    })
    for(var i=0; i<states.length;i++){
        if(states[i].key==this.getCurrentState().key)
            return states[i+1];
    }
};

MachineState.prototype.getStateByKey = function(key){
    for(var i=0;i<this.states.length;i++){
        if(this.states[i].key == key)
            return this.states[i];
    }

    return this.states[0];
}


util.inherits(MachineState, EventEmitter);
module.exports = MachineState;