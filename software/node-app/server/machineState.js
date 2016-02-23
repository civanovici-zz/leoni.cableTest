/**
 * Created by roduino on 2/16/2016.
 */

function MachineState(){
    this.stopCheckingCableHandler=0; //variable to store setInterval handler
    this.stopCurrentLeakeageHandler=0; //variable to store setInterval handler
    this.intervalToCheckCabllePresent =500; //interval to check if cable are attached
    this.intervalToCheckCablleLeakCurrent =1000; //interval to check if cable has leaks
    this.cablePresentCount = 0; //how many times are checking if cable are attached
    this.cablePresentMaxCount = 10; //how many times are checking if cable are attached
    this.microwaveTimeout = 5000;
    this.vaccumTimeout = 10000;
    this.leakCurrentSample=[]; //temp var for current samples
    this.leakCurrentTotalSampleCount = 5; //how many samples to measure
    this.salmpleOK=0;
    this.salmpleNOK=0;


    this.EMERGENCY_STATE="EMERGENCY";
    this.UNKNOWN_STATE="unknown";
    this.MOVE_TO_START_POSITION_STATE = "moveToStartPosition";
    this.WAIT_TO_ATTACH_CABLE_STATE = "waitForCable";
    this.CABLE_ATTACHED_STATE = "cableAttached";
    this.MOVING_TO_TEST_POSITION_STATE = "movingToTestPosition";
    this.READY_FOR_TEST_STATE = "readyForTest";
    this.TEST_EXECUTION_STATE = "testExecution";
    this.CABLE_DETACHTED_IN_TEST_STATE = "cableDetachedInTest";
    this.TEST_EXECUTION_COMPLETE_STATE = "testExecutionComplete";
    this.MOVING_TO_START_POSITION_STATE = "movingToStartPosition";

    this.states=[
        {
            key:0,
            name:this.EMERGENCY_STATE,
            messageToScreen:"EMERGENCY button pressed",
            startButtonDisabled:true,
            startButtonLabel:"START",
            resetGraph:true,
            arduinoCommands:["0","4","6"]
        },
        {
            key:1,
            name:this.UNKNOWN_STATE,
            messageToScreen:"Please press START",
            startButtonDisabled:false,
            startButtonLabel:"START",
            resetGraph:true,
            arduinoCommands:["0","4","6"]
        },
        {
            key:2,
            name:this.MOVE_TO_START_POSITION_STATE,
            messageToScreen:"Moving to START position",
            startButtonDisabled:true,
            startButtonLabel:"START",
            arduinoCommands:["1","9"],
            nextState:3,
            resetGraph:true
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
            key:8,
            name:this.TEST_EXECUTION_COMPLETE_STATE,
            messageToScreen:"Wait for results",
            startButtonDisabled:true,
            startButtonLabel:"WAIT",
            arduinoCommands:["1","4","6"],
            nextState:9
        },
        {
            key:9,
            name:this.MOVING_TO_START_POSITION_STATE,
            startButtonDisabled:true,
            startButtonLabel:"WAIT",
            arduinoCommands:["4","6"]
        },
        {
            key:50,
            name:this.CABLE_DETACHTED_IN_TEST_STATE,
            messageToScreen:"Cable detached, please press START",
            arduinoCommands:["0","4","6"],
            startButtonDisabled:false,
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
    me.leakCurrentSample.length=0;
    me.salmpleOK=0;
    me.salmpleNOK=0;
};
MachineState.prototype.setUndefinedState = function(){
    this.currentState = this.states[1];
    this.resetInternalState();
};

MachineState.prototype.setCableDetachedState = function(){
    this.currentState=this.getStateByKey(50);
    this.resetInternalState();
    return this.currentState;
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
        if(this.states[i].key == key) {
            return this.states[i];
        }
    }

    return this.states[0];
};

module.exports = MachineState;