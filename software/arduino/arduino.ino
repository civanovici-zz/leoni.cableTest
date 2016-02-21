
#define MOTOR_STEP_PIN 9
#define MOTOR_DIR_PIN 10
#define VACCUM_PIN 6
#define MICROWAVE_PIN 5
#define LIMIT_TOP_PIN A3
#define LIMIT_BOTTOM_PIN A2
#define EMERGENCY_PIN A5
#define CABLE1_PIN A1
#define CABLE2_PIN A0
#define CABLES_PIN A4

#define COMMAND_MOTOR_STOP 48 //0
#define COMMAND_MOTOR_UP 49   //1
#define COMMAND_MOTOR_DOWN 50 //2
#define COMMAND_VACCUM_ON 51  //3
#define COMMAND_VACCUM_OFF 52 //4
#define COMMAND_MICROWAVE_ON 53//5
#define COMMAND_MICROWAVE_OFF 54//6
#define COMMAND_MEASURE_CURRENT 55//7
#define COMMAND_ATTACHED_WATCH_CABLE_ON 56//8
#define COMMAND_ATTACHED_WATCH_CABLE_OFF 57//9

boolean isMoving=false;
int moveDirection=0;

boolean emergencyState = false;
boolean bottomLimitState = false;
boolean topLimitState = false; 
boolean watchAttachedCable = false;

//debounce emergency
long debounceDelay = 50;    // the debounce time; increase if the output flickers
long lastDebounceTimeEmergency = 0;  // the last time the output pin was toggled
int lastEmergencyState=1;


void setup(){
  Serial.begin(9600);
  pinMode(MOTOR_STEP_PIN,OUTPUT);
  pinMode(MOTOR_DIR_PIN,OUTPUT);
  pinMode(VACCUM_PIN,OUTPUT);
  pinMode(MICROWAVE_PIN,OUTPUT);
  
  pinMode(LIMIT_TOP_PIN, INPUT_PULLUP);
  pinMode(LIMIT_BOTTOM_PIN, INPUT_PULLUP);
  pinMode(EMERGENCY_PIN, INPUT_PULLUP);
  pinMode(CABLE1_PIN, INPUT_PULLUP);
  pinMode(CABLE2_PIN, INPUT_PULLUP);
  pinMode(CABLES_PIN, INPUT_PULLUP);
  digitalWrite(MOTOR_DIR_PIN, HIGH);
}

void loop(){
  if(Serial.available()>0){
    int byte = Serial.read();
    String message ="OK";
    switch(byte){
      case COMMAND_MOTOR_STOP:
        isMoving = false;
        break;
      case COMMAND_MOTOR_UP:
        digitalWrite(MOTOR_DIR_PIN, LOW);
        Serial.print("low");
        delay(100);
        isMoving = true;
        break;
      case COMMAND_MOTOR_DOWN:
        digitalWrite(MOTOR_DIR_PIN, HIGH);
        Serial.print("high");
        delay(100);
        isMoving = true;
        break;
      case COMMAND_VACCUM_ON:
        digitalWrite(VACCUM_PIN, HIGH);
        break;
      case COMMAND_VACCUM_OFF:
        digitalWrite(VACCUM_PIN, LOW);
        break;
      case COMMAND_MICROWAVE_ON:
        digitalWrite(MICROWAVE_PIN, HIGH);
        break;
      case COMMAND_MICROWAVE_OFF:
        digitalWrite(MICROWAVE_PIN, LOW);
        break;
      case COMMAND_MEASURE_CURRENT:
        //todo: measure current
        break;
    case COMMAND_ATTACHED_WATCH_CABLE_ON:
        watchAttachedCable = true;
        break;
    case COMMAND_ATTACHED_WATCH_CABLE_OFF:
        watchAttachedCable = false;
        break;
      default:
        message = "UNKNOW COMMAND";
        Serial.print(byte);
        break;     
    }
    Serial.print(byte);
  Serial.println(message);
  Serial.flush();  
  }
  readMachineState();
  driveStepper();
}

void readMachineState(){
  if(watchAttachedCable){
    //TODO: check cable connection
  }
  int topLimit,bottomLimit,emergency;
  
  bottomLimit = digitalRead(LIMIT_BOTTOM_PIN);
  topLimit = digitalRead(LIMIT_TOP_PIN);
  emergency = digitalRead(EMERGENCY_PIN);
  debounceEmergency(emergency);
  
  if(bottomLimit!=bottomLimitState){
    sendEvent(String("BOTTOM_LIMIT:")+String(bottomLimit));
    bottomLimitState = bottomLimit;
  if(bottomLimitState == true){
    isMoving = false;
  }
  }
  
  if(topLimit !=topLimitState){
    sendEvent(String("TOP_LIMIT:")+String(topLimit));
    topLimitState = topLimit;
  if(topLimitState == true){
    isMoving = false;
  }
  }
}

void sendEvent(String msg){
  Serial.println("EVENT:"+msg);
}

//drive stepper motor
void driveStepper(){
  if(isMoving==false)
    return;   
  int speedDelay=500;
  digitalWrite(MOTOR_STEP_PIN, LOW);
  delayMicroseconds(4);
  digitalWrite(MOTOR_STEP_PIN, HIGH);
  delayMicroseconds(speedDelay);

}

void debounceEmergency(int reading){
  if(reading != lastEmergencyState){
    lastDebounceTimeEmergency =millis();
  }
  
  if((millis() - lastDebounceTimeEmergency) > debounceDelay) {
    if(reading != emergencyState){
    emergencyState = reading;
      sendEvent(String("EMERGENCY:")+String(emergencyState));
    isMoving = false;     
    }
  }

  lastEmergencyState = reading;
}
