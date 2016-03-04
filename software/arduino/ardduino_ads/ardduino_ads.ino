#include <Wire.h>
#include <Adafruit_ADS1015.h>

 Adafruit_ADS1115 ads;

#define MOTOR_STEP_PIN 12
#define MOTOR_DIR_PIN 13
#define VACCUM_PIN A4
#define MICROWAVE_PIN A0
#define LIMIT_TOP_PIN 7
#define LIMIT_BOTTOM_PIN 3
#define EMERGENCY_PIN 11
//#define CABLE1_PIN A1
#define CABLE2_PIN A8
//#define CABLES_PIN A4

#define COMMAND_MOTOR_STOP 48 //0
#define COMMAND_MOTOR_UP 49   //1
#define COMMAND_MOTOR_DOWN 50 //2
#define COMMAND_VACCUM_ON 51  //3
#define COMMAND_VACCUM_OFF 52 //4
#define COMMAND_MICROWAVE_ON 53//5
#define COMMAND_MICROWAVE_OFF 54//6
#define COMMAND_MEASURE_CURRENT 55//7
#define COMMAND_READ_CABLE_CONNECTION 56//8
#define COMMAND_GET_LIMIT_SWITCH_STATE 57//9
#define MOVING_UP 1
#define MOVING_DOWN 2
#define MOVING_NONE 0

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

long lastDebounceTimeTopLimit = 0 ;
int lastTopLimitState = 1;

long lastDebounceTimeBottomLimit = 0 ;
int lastBottomLimitState = 1;

int movingDirection =0;


void setup(){
  Serial.begin(9600);
  pinMode(MOTOR_STEP_PIN,OUTPUT);
  pinMode(MOTOR_DIR_PIN,OUTPUT);
  pinMode(VACCUM_PIN,OUTPUT);
  pinMode(MICROWAVE_PIN,OUTPUT);

  digitalWrite(MICROWAVE_PIN,LOW);
  digitalWrite(VACCUM_PIN,LOW);
    
  pinMode(LIMIT_TOP_PIN, INPUT_PULLUP);
  pinMode(LIMIT_BOTTOM_PIN, INPUT_PULLUP);
  pinMode(EMERGENCY_PIN, INPUT_PULLUP);
  //pinMode(CABLE1_PIN, INPUT_PULLUP);
  pinMode(CABLE2_PIN, INPUT_PULLUP);
  //pinMode(CABLES_PIN, INPUT_PULLUP);
  digitalWrite(MOTOR_DIR_PIN, HIGH);

  pinMode(CABLE2_PIN, INPUT_PULLUP);

  ads.setGain(GAIN_TWO);
  ads.begin();
  
}

void loop(){
//  delay(100);
//  int16_t results;
  
  /* Be sure to update this value based on the IC and the gain settings! */
//  float   multiplier = 0.125F;    /* ADS1015 @ +/- 6.144V gain (12-bit results) */
  //float multiplier = 0.1875F; /* ADS1115  @ +/- 6.144V gain (16-bit results) */

//  results = ads.readADC_Differential_0_1();  
//  Serial.print(" Differential: "); Serial.print(results); Serial.print("("); Serial.print(results * multiplier); Serial.println("mV)");

  
  if(Serial.available()>0){
    int byte = Serial.read();
    String message ="OK";
   
    switch(byte){
      case COMMAND_MOTOR_STOP:
        isMoving = false;
        movingDirection =MOVING_NONE;
        break;
      case COMMAND_MOTOR_UP:
        digitalWrite(MOTOR_DIR_PIN, LOW);
        movingDirection = MOVING_UP;
        delay(100);
        isMoving = true;
        break;
      case COMMAND_MOTOR_DOWN:
        digitalWrite(MOTOR_DIR_PIN, HIGH);
        movingDirection = MOVING_DOWN;
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
        measureLeakCurrent();
        break;
      case COMMAND_READ_CABLE_CONNECTION:
        measureCableConnection();
        break;
      case COMMAND_GET_LIMIT_SWITCH_STATE:
        sendEvent(String("LIMIT_SWITCH:")+String(topLimitState)+String(":")+String(bottomLimitState));
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

  int topLimit,bottomLimit,emergency;
  
  bottomLimit = digitalRead(LIMIT_BOTTOM_PIN);
  topLimit = digitalRead(LIMIT_TOP_PIN);
  emergency = digitalRead(EMERGENCY_PIN);
  debounceEmergency(emergency);
  debounceTopLimit(topLimit);
  debounceBottomLimit(bottomLimit);
}

void measureCableConnection(){
  int cableConnection = digitalRead(CABLE2_PIN);
  sendEvent(String("CABLE_CONNECTION:")+String(cableConnection));
}

void measureLeakCurrent(){
  Serial.println("measure current");
  int cableConnection = digitalRead(CABLE2_PIN);
  int16_t results;
  float multiplier = 0.125F;
  results = ads.readADC_Differential_0_1(); 
  Serial.print(" Differential: "); Serial.print(results); Serial.print("("); Serial.print(results * multiplier); Serial.println("mV)");

  //int cableConnection = analogRead(CABLE2_PIN);
  //int leakCurrent = analogRead(CABLE1_PIN);
  sendEvent(String("LEAK_CURRENT:")+String(results)+String(":")+String(cableConnection));
}


void sendEvent(String msg){
  Serial.println("EVENT:"+msg);
}

//drive stepper motor
void driveStepper(){
  if(isMoving==false)
    return;   
  if(movingDirection ==MOVING_UP && topLimitState == 0)
  {
    movingDirection = MOVING_NONE;
    isMoving =false;
  }

  if(movingDirection ==MOVING_DOWN && bottomLimitState == 0)
  {
    movingDirection = MOVING_NONE;
    isMoving =false;
  }
  
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
      movingDirection = MOVING_NONE; 
    }
  }
  lastEmergencyState = reading;
}

void debounceTopLimit(int reading){
  if(reading != lastTopLimitState){
    lastDebounceTimeTopLimit =millis();
  } 
  if((millis() - lastDebounceTimeTopLimit) > debounceDelay) {
    if(reading != topLimitState){
      topLimitState = reading;
      if(movingDirection == MOVING_UP){
        sendEvent(String("TOP_LIMIT:")+String(topLimitState));
        isMoving = false;  
        movingDirection = MOVING_NONE;   
      }
    }
  }
  lastTopLimitState = reading;
}

void debounceBottomLimit(int reading){
  if(reading != lastBottomLimitState){
    lastDebounceTimeBottomLimit =millis();
  } 
  if((millis() - lastDebounceTimeBottomLimit) > debounceDelay) {
    if(reading != bottomLimitState){
      bottomLimitState = reading;
      if(movingDirection == MOVING_DOWN){
        sendEvent(String("BOTTOM_LIMIT:")+String(bottomLimitState));
        isMoving = false;   
        movingDirection = MOVING_NONE;   
      }
    }
  }
  lastBottomLimitState = reading;
}

void debounceInput(int reading, int lastInputState, long lastDebounceTime, int inputState,String eventName){
  if(reading != lastInputState){
    lastDebounceTime =millis();
  }  
  if((millis() - lastDebounceTime) > debounceDelay) {
    if(reading != inputState){
      inputState = reading;
      sendEvent(String(eventName)+String(inputState));
      isMoving = false;     
    }
  }
  lastInputState = reading;
}
