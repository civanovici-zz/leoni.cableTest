#include <U8glib.h>
#include "pitches.h"


#define enabX 38
#define stepX A0
#define dirX A1

#define enabY A3
#define stepY A6
#define dirY A7

#define xMin 2 //move HOME 
#define xMax 3 //move START
#define yMin 14 // bottom position
#define yMax 15 //top position
#define zMin 18 //emergency
#define zMax 19 //NC
#define c2 A3 // connector curent de fuga 
#define c1 A4 // connector continuitate fire
#define ledRed A5
#define ledGreen A10
#define relee 4

#define relee_Piezo 5


#define BEEP_OK 1
#define BEEP_ERROR 2
#define BEEP_FINISH 3
#define BEEP_WAITING 4


#define MOVE_UP 1
#define MOVE_DOWN 0
boolean isMoving=false;
int moveDirection=0;

int PiezoTime = 10000;

//switches
int emergencyButton=0; //not presset
int contact = 0; //not presset
int maxLimit =0; //not presset
int minLimit = 0; //not presset
int startButton = 1; //not presset
int homeButton = 1; //not presset

long debounceDelay = 50;    // the debounce time; increase if the output flickers
long lastDebounceTimeEmergency = 0;  // the last time the output pin was toggled
int emergencyState;
int lastEmergencyState=1;

// state machine
int isInitialized = 0; //pana cand nu sunt verificate cablurile
int operationFinish =0; //cand s-a terminat operatia
int maxState;
int minState;
int checkingCableStatus = 0; //process de verificare a cablului
unsigned long tmpTime; //temp variable for timeout calculation
int timeout =10000; //time to wait in cable checking process 
//cable present
bool cablePresent = false; //if cables are attached to machine
long tmpCheckCableTime=0; 
int checkCablePresentCounter=0; //counter incrementat la verificarea existentei cablului


//cable leakeage
bool cableLeakeage =false; //daca cablul are gauri
long tmpCheckLeakeageTime = 0; //tmp pentru verificare periodica
int checkLeakeageCounter = 0; // counter incrementat la verificarea curentului
float leakeageCurrent = 0; //suma curentului pierdut la fiecare verificare; 
int leakeageTimeout = 500; //la ce intervale se verifica daca exista pierderi
int leackeageCounter = 10; // de cate ori se ruleaza verificarea cablului
long tmpDelayVacuum =0; //tmp pentru delay pompa vaccum
float currentValues[10]; //cate valori sunt citite = leackeageCounter

//display
#define LCD_PINS_RS 16
#define LCD_PINS_ENABLE 17
#define LCD_PINS_D4 23
#define LCD_PINS_D5 25
#define LCD_PINS_D6 27
#define LCD_PINS_D7 29
#define BEEPER 37
#define BTN_EN1 31
#define BTN_EN2 33
#define BTN_ENC 35
#define SDCARDDETECT 22
#define MISO 50
#define MOSI 51
#define SCK 52
#define SS 53

U8GLIB_ST7920_128X64_1X u8g(LCD_PINS_D4, LCD_PINS_ENABLE, LCD_PINS_RS);

//temp memory
char* buff1;
char* buff2;
char* buff3;
char* buff4;


bool debugEnabled=false;
char *message[4];
char *debugMsg[10];
char *title = "";
uint8_t menu_redraw_required = 0;
int displayCounter=0;


void setup() {
  Serial.begin(9600);
 
  printTitle( "INITIALIZATION");
  
  pinMode(stepX,OUTPUT);
  pinMode(dirX,OUTPUT);
  pinMode(enabX,OUTPUT);
  
  pinMode(relee, OUTPUT);
  digitalWrite(relee, HIGH);
  
   pinMode(relee_Piezo, OUTPUT);
  digitalWrite(relee_Piezo, HIGH);
  
  pinMode(xMin, INPUT_PULLUP);
  pinMode(xMax, INPUT_PULLUP);
  pinMode(yMin, INPUT_PULLUP);
  pinMode(xMax, INPUT_PULLUP);
  pinMode(zMin, INPUT_PULLUP);
  pinMode(zMax, INPUT_PULLUP);
  pinMode(c1, INPUT_PULLUP);
  pinMode(c2, INPUT_PULLUP);
 
  pinMode(ledRed, OUTPUT);
  pinMode(ledGreen, OUTPUT);
  digitalWrite(enabX,LOW);
  digitalWrite(ledRed,HIGH);
  digitalWrite(ledGreen, HIGH);
  buzz(BEEP_OK);
  
  u8g.setColorIndex(1);         // pixel on    
  //char *msg[2]={"rand 1","rand 2"};
  //printMessage(msg);

}
int freeRam (){
  extern int __heap_start, *__brkval;
  int v;
  return (int) &v - (__brkval == 0 ? (int) &__heap_start : (int) __brkval);
}
void loop() {

  
  //green on
  //digitalWrite(ledRed,LOW);
  //digitalWrite(ledGreen, HIGH);
  //delay(1000);
  
  //red on
  //digitalWrite(ledRed,HIGH);
  //digitalWrite(ledGreen, LOW);
  //delay(1000);
  
  //off red/green
  //digitalWrite(ledRed,HIGH);
  //digitalWrite(ledGreen, HIGH);
  //delay(1000);

  //debugInputs();
  //checkCableStillPresent();
  //startCheckingCable();
  
  //return;
  
  maxLimit = digitalRead(xMax);
  minLimit = digitalRead(xMin);
  startButton = digitalRead(zMin);
  homeButton = digitalRead(zMax);
  
  emergencyButton=digitalRead(yMin);
  debounceEmergency(emergencyButton);  

  checkMachineState();
  
  if (  menu_redraw_required != 0 ) {
    u8g.firstPage();
    do  {
      draw();
    } while( u8g.nextPage() );
    menu_redraw_required = 0;
  }
  
  free(buff1);
  free(buff2);
  free(buff3);
  free(buff4);
  
  moving();
  //Serial.print("memory");
  //Serial.println(freeRam());
}

void checkMachineState(){

  //avarie
  if(emergencyState == 1){
    printTitle("EMERGENCY");
    char *msg[] = {"","Emergency button presset","",""};
    printMessage(msg);
    resetMachineState();
    stopMovement();
    
    return;
  }

  //parking
  if(startButton ==1 && isMoving==false && operationFinish == 0 && isInitialized==0){
    printTitle("PARKING");
    char *msg[] = {"","Parking mode","",""};
    printMessage(msg);
    isMoving = true;
    moveDirection = MOVE_DOWN;
    digitalWrite(dirX,MOVE_DOWN);
    digitalWrite(ledRed,HIGH);
    digitalWrite(ledGreen, HIGH);

    moving();
    return;
  }
  
  //homing
  if(homeButton ==1 && isMoving == false && isInitialized==0){
    printTitle("HOMING");
    char *msg[] = {"","GOING HOME","",""};
    printMessage(msg);
    isMoving = true;
    moveDirection = MOVE_UP;
    digitalWrite(dirX,MOVE_UP);
    moving();
    digitalWrite(ledRed,HIGH);
    digitalWrite(ledGreen, HIGH);
    
    return;
  }
     
  //stare incerta
  if(minLimit==0 && maxLimit==0 && isMoving == false && isInitialized==0){
    printTitle("STATUS UNCERTAIN");
    char *msg[] = {"","Press HOME","Press START to park",""};
    printMessage(msg);
    digitalWrite(ledRed,HIGH);
    digitalWrite(ledGreen, HIGH);

    return;
  }
  
  //park position
  if(minLimit==1 && isMoving==false && isInitialized ==0 && checkingCableStatus==0){
    printTitle("STATUS UNCERTAIN");
    char *msg[] = {"","Press HOME","Press START to park",""};
    printMessage(msg);
    digitalWrite(ledRed,HIGH);
    digitalWrite(ledGreen, HIGH);

    return;
  }
   
  //moving up, for homing
  if(maxLimit !=1 && isMoving==true && moveDirection == MOVE_UP && operationFinish==0){
    printTitle("HOME POSITION");
    checkingCableStatus=0;
    stopMovement();
    cablePresent=false;
    char *msg[] ={"","Machine ready","Please attach cables",""};
    printMessage(msg);
    isInitialized=1;
    digitalWrite(ledRed,HIGH);
    digitalWrite(ledGreen, HIGH);

    return;
  }
    
  //moving up after operation complete
  if(maxLimit !=1 && isMoving==true && moveDirection == MOVE_UP && operationFinish==1){
    printTitle("HOME POSITION");
    checkingCableStatus=0;
    //operationFinish=0;
    stopMovement();
    //cablePresent=false;
    char *msg[] ={"","Machine ready1","Please remove cables","Press HOME to continue"};
    printMessage(msg);
    digitalWrite(ledRed,HIGH);
    digitalWrite(ledGreen, HIGH);
       
    return;
  }

  if(maxLimit ==0 && operationFinish == 1 && isMoving==false && cablePresent==true){
    cablePresent=false;
    printTitle("HOME POSITION");
    char *msg[] ={"","Machine ready","Please remove cables","Press HOME to continue"};
    printMessage(msg);
    Serial.println("home, cable present");
    return;
  }

  //is in home, cables are removed, reset machine
  if(homeButton ==1 && maxLimit ==0 && operationFinish == 1 && isMoving==false && cablePresent==false){
    printTitle("RESET MACHINE STATE");
    Serial.println("reseting state");
    resetMachineState();
    return;
  }  
 
  // check cable continuity
  if(checkingCableStatus ==true & isMoving ==false && minLimit!=1){
    if(checkCableStillPresent() == false){
      printTitle("CABLE DETACHED");
      char *msg1[] = {"","Press HOME to restart","",""};
      printMessage(msg1);
      digitalWrite(relee,HIGH);
      
      checkingCableStatus=false;
      operationFinish=1;
      digitalWrite(relee,HIGH);
      digitalWrite(relee_Piezo,HIGH);
      return;
    }

    if( millis()-tmpDelayVacuum <PiezoTime){
      char *msg[] ={"","Vacuum initializing ..","Please wait",""};
      printMessage(msg);  
      return;
    }
       
    if(checkLeakeageCounter < leackeageCounter){
      digitalWrite(relee_Piezo,HIGH);
      startCheckingCable();
      
    }else{
      float tmpCurrent = leakeageCurrent/(leackeageCounter);
      Serial.print("current ...");
      Serial.println(tmpCurrent);
      int nrFailure=0;
      for(int i=0; i<leackeageCounter ; i++){
        if(currentValues[i]>0.05){
          nrFailure++;
        }     
      }
      
      if(nrFailure>1){
        tmpCurrent =3; //this is ...
      }
      //algoritm pt medie
      if(tmpCurrent<0.1){
        
        cableLeakeage=false;
        digitalWrite(ledRed,LOW);
        digitalWrite(ledGreen, HIGH);

        printTitle("FINISH TEST - PASS");
        char *msg[] = {"","Cable integrity passed","Press HOME to start",""};
        printMessage(msg);
        buzz(BEEP_FINISH);
      }else{
        cableLeakeage=true;
        digitalWrite(ledRed,HIGH);
        digitalWrite(ledGreen, LOW);
  
        printTitle("FINISH TEST - FAILURE");
        char *msg[] = {"","Cable has leakeage","Press HOME to start",""};
        printMessage(msg);
        buzz(BEEP_ERROR);     
      }
      checkingCableStatus=false;
      operationFinish=1;
      digitalWrite(relee,HIGH);
      digitalWrite(relee_Piezo,HIGH);
    }
    return;
  }
  
  //machine position top, checking for cable presents
  if(isMoving==false && cablePresent==false && maxLimit!=1 && operationFinish==0){
    printTitle("CHECKING CABLE");
    
    checkCablePresent();
    return;
  }
 
   //cable not attached on moving down to test
  if(checkCableStillPresent() == false && isMoving ==true && moveDirection == MOVE_DOWN){
    stopMovement();
    printTitle("CABLE DETACHED");
    char *msg[] = {"","Press HOME to start","",""};
    printMessage(msg);
    //resetMachineState();    
  }
 
  //press START to begin new cycle
  if(startButton ==1 && isMoving==false && cablePresent==true){
    printTitle("CABLE ATTACHED");
    checkCablePresentCounter=0;
    char *msg[] ={"","Moving down","",""};
    printMessage(msg);
    isMoving = true;
    moveDirection = MOVE_DOWN;
    digitalWrite(dirX,MOVE_DOWN);
    digitalWrite(ledRed,HIGH);
    digitalWrite(ledGreen, HIGH);
    
    moving();
    return;
  }
  
  //press HOME
  if(homeButton == 1 && isMoving==false){
    printTitle("MACHINE READY");
    char *msg[] ={"","Moving up..","",""};
    printMessage(msg);
    isMoving = true;
    moveDirection = MOVE_UP;
    digitalWrite(dirX,MOVE_UP);
    return;
  }
  
   //bottom not moving after operation finish
  if(operationFinish ==1 && minLimit !=1 && isMoving ==false){
    //wait for home
    Serial.println("op finish");
    return;
  }
  
  //bottom limit, in testing process
  if(minLimit !=1 && isMoving==true && isInitialized==1 && moveDirection == MOVE_DOWN){
    
    stopMovement();
    tmpTime=millis();
    tmpDelayVacuum = millis();
    checkingCableStatus=1;
    char *msg2[] ={"","Checking cable ..","Please wait",""};
    printMessage(msg2);
    digitalWrite(relee,LOW);
    digitalWrite(relee_Piezo,LOW);
    return;
  }

  //bottom not moving
  if(minLimit !=1 && isMoving ==false){
    printTitle("MACHINE READY");
    char *msg[] ={"","Machine ready","Press HOME",""};
    printMessage(msg);
    return;
  }
  
  //botom limit - safty
  if(minLimit !=1 && isMoving ==true && moveDirection == MOVE_DOWN){
    printTitle("MACHINE READY");
    stopMovement();
    char *msg[] ={"","Machine at minim pos","Please press HOME",""};
    printMessage(msg);
  }
}

boolean checkCableStillPresent(){
  int s1 = analogRead(c2);
  float voltage = s1 * (5.0 / 1023.0 );
//  Serial.print("curent prezenta cablu: ");
//  Serial.print(s1);
//  Serial.print(" : ");
//  Serial.println(voltage);
  
  return voltage < 3;
}


void resetMachineState(){
    isInitialized = 0;
    cablePresent =false; 
    checkingCableStatus =0;
    operationFinish = 0;
    checkLeakeageCounter=0;
    leakeageCurrent = 0;
    checkCablePresentCounter =0;
    digitalWrite(ledRed,HIGH);
    digitalWrite(ledGreen, HIGH);
    digitalWrite(relee,HIGH);
    digitalWrite(relee_Piezo,HIGH);
}

float fmap(float x, float in_min, float in_max, float out_min, float out_max) {
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

void startCheckingCable(){

  printTitle("CABLE INTEGRITY");
  char *msg[] ={"","Checking clable","Please wait",""};
  int voltage = analogRead(c1);
  float current1 = (5.0 - voltage * (5.0 / 1023.0 ))/0.670;
  currentValues[checkLeakeageCounter] = current1;
  //current measured througt 680 ohm resitor
  Serial.print("Tensiunea: ");
  Serial.print(voltage * (5.0 / 1023.0 ));
  Serial.print(" curent: ");
 Serial.println(current1);
  msg[1]="Test counter ";
  msg[2]="Leak current: ";
  //msg[3]="";
  leakeageCurrent=leakeageCurrent+current1;
  char t1[3];
  char t2[5];
  char t3[5];
  itoa(checkLeakeageCounter, t1,10);
  dtostrf(current1, 3, 2, t2);
  //dtostrf(amp2, 3, 2, t3);
  buff1 =(char*) malloc(30*sizeof(char));
  buff2 =(char*) malloc(30*sizeof(char));
  //buff3 =(char*) malloc(30*sizeof(char));

  sprintf(buff1,"Test counter %s",t1);
  sprintf(buff2,"Leak current:  %smA",t2);
  //sprintf(buff3,"Leak current:  %smA",t3);

  //msg[0]=buff1;
  msg[2]=buff2;
  //msg[3]=buff3;
  
  checkLeakeageCounter++;
   
  printMessage(msg);
  buzz(BEEP_WAITING);
}

void checkCablePresent(){
  if( millis()-tmpCheckCableTime <1000)
    return;
  tmpCheckCableTime = millis();
  
  char *msg[] ={"","Checking for cables ...","Please wait",""};
  char *msgEmpty[] ={"","","Please wait...",""};
  char *msgNotPresent[] ={"","Cable not present","Please attach cables",""};

  checkCablePresentCounter++;
  
  int s2 = analogRead(c2);
  float voltage = s2 * (5.0 / 1023.0 );

  char t1[3];
  itoa(checkCablePresentCounter, t1,10);
  buff4 =(char*) malloc(30*sizeof(char));
  msgNotPresent[1]="Wait cable detection ";
  sprintf(buff4,"%s %i",msgNotPresent[1],checkCablePresentCounter);

  msgNotPresent[1]=buff4;
//  Serial.print(" tensiunea: ");
//  Serial.println(voltage);
  
  //when cables are connected measured voltage drop from 3.6V to 1.8V
  if(voltage > 3.0){
     
    printMessage(msgNotPresent);
    buzz(BEEP_WAITING);
  }else{
    if(checkCablePresentCounter>3){
      cablePresent=true;
      //pinMode(c2, INPUT_PULLUP);
      printTitle("CABLE ATTACHED");
      msgNotPresent[1] = "Cable detected!";
      msgNotPresent[2] = "Press START";
      printMessage(msgNotPresent);

      buzz(BEEP_OK);
    }
  }
}

void debugInputs(){
  //char *str[12]={"DownL: ",char(digitalRead(xMin)),
  //  " UpL: ",char(digitalRead(xMax))," C: ",char(digitalRead(yMin)),
  //  " E: ",char(digitalRead(yMax)),
  Serial.print(" Down: ");
  Serial.print(digitalRead(zMin));
  Serial.print(" Up: ");
  Serial.print(digitalRead(zMax));
  Serial.print(" C1: ");
  Serial.print(digitalRead(c1));
  Serial.print(" C2: ");
//  Serial.print(digitalRead(c2));
  Serial.println();
   //debug(str);
}

void moving(){
 if(isMoving==false)
    return;
    
 int speedDelay=500;

  digitalWrite(stepX, LOW);
  delayMicroseconds(4);
  digitalWrite(stepX, HIGH);
  delayMicroseconds(speedDelay);
  //char *str[3] = {"moving to:",char(moveDirection),"<--"}; 
  //debug(str);
}

void stopMovement(){
  isMoving=false;  
  char *msg[] = {"","Stoped!","",""};
  printMessage(msg);
}

void printTitle(char *msg){
  if(title!=msg){
    title=msg;
    menu_redraw_required=1;
  }
}

void printMessage(char *msg[]){
    Serial.print("msg: ");
    for(uint8_t i=0;i<4;i++){         
      Serial.print(msg[i]);    
      message[i]=msg[i];  
      if(i<3)
       Serial.print(" / ");   
    }
    Serial.println("");
    menu_redraw_required=1; 
}

void draw(){
  char *str[1] = {"drawing title"}; 
  debug(str);
  
  u8g_uint_t w, d;
  uint8_t i, h,offsetTitle;
  
  u8g.setFont(u8g_font_6x13);
  u8g.setFontRefHeightText();
  u8g.setFontPosTop();
  h = u8g.getFontAscent()-u8g.getFontDescent();
  w = u8g.getWidth();
  u8g.drawFrame(0, 0, w, h+2);
  offsetTitle = h+2;
  //u8g.setDefaultForegroundColor();
  //u8g.setDefaultBackgroundColor();
  d = (w-u8g.getStrWidth(title))/2;
  u8g.drawStr( d, 1, title);
  
  //draw message
  u8g.setFont(u8g_font_5x7);
  u8g.setFontRefHeightText();
  u8g.setFontPosTop();
  
  h = u8g.getFontAscent()-u8g.getFontDescent();
  w = u8g.getWidth();
  for( i = 0; i < 4; i++ ) {
    d = (w-u8g.getStrWidth(message[i]))/2;
    //u8g.setDefaultForegroundColor();
    
    u8g.drawStr(0, i*h+offsetTitle, message[i]);
  }
}

void debug(char *msg[]){
  if(debugEnabled == false)
    return;
  for(uint8_t i=0;i<sizeof(msg);i++){
    Serial.print(i);
    Serial.print("/");
    Serial.print(sizeof(msg));
    Serial.print(" d:-->");
    Serial.print(msg[i]);
    Serial.println("<--");
  }
  Serial.println();
}


void buzz(int k){
  int finishMelody[] = {NOTE_C4, NOTE_G3, NOTE_G3, NOTE_A3, NOTE_G3, 0, NOTE_B3, NOTE_C4};
  int finishNoteDuration[] = {4, 8, 8, 4, 4, 4, 4, 4}; 
  
  int okMelody[] = {NOTE_C4, NOTE_G3};
  int okDuration[] = {8,4};
  
  int waitingMelody[] = {NOTE_D3, NOTE_A5};
  int waitingDuration[] = {8,8};
  
  int errorMelody[] = {NOTE_D3, NOTE_A5,NOTE_D3, NOTE_A5,NOTE_D3, NOTE_A5,NOTE_D3, NOTE_A5};
  int errorDuration[] = {8,8,8,8,8,8,8,8};

  switch(k){
    case BEEP_FINISH:
        for(int thisNote=0;thisNote<8;thisNote++){
          int noteDuration = 1000 / finishNoteDuration[thisNote];
          tone(BEEPER, finishMelody[thisNote], noteDuration);
          delay(noteDuration * 1.30);
          noTone(BEEPER);
        }
      break;
    case BEEP_OK:
      digitalWrite(ledRed,LOW);
      digitalWrite(ledGreen, HIGH);

      for(int thisNote=0;thisNote<2;thisNote++){
          int noteDuration = 1000 / okDuration[thisNote];
          tone(BEEPER, okMelody[thisNote], noteDuration);
          delay(noteDuration * 1.30);
          noTone(BEEPER);
        }
      break;
    case BEEP_ERROR:
       digitalWrite(ledRed,HIGH);
       digitalWrite(ledGreen, LOW);

       for(int k = 0;k<5;k++){ 
        for(int thisNote=0;thisNote<2;thisNote++){
            int noteDuration = 1000 / errorDuration[thisNote];
            tone(BEEPER, errorMelody[thisNote], noteDuration);
            delay(noteDuration * 1.30);
            noTone(BEEPER);
          }   
       }
      break;
    case BEEP_WAITING:
      for(int thisNote=0;thisNote<2;thisNote++){
          int noteDuration = 1000 / waitingDuration[thisNote];
          tone(BEEPER, waitingMelody[thisNote], noteDuration);
          delay(noteDuration * 1.30);
          noTone(BEEPER);
        }
      break;
  }
  
}



void debounceEmergency(int reading){
  if(reading != lastEmergencyState){
    lastDebounceTimeEmergency =millis();
  }
  
  if((millis() - lastDebounceTimeEmergency) > debounceDelay) {
    if(reading != emergencyState){
      
      emergencyState = reading;
    }
  }

  lastEmergencyState = reading;
}



