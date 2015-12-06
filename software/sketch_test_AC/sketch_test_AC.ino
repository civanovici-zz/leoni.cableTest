

void setup(){
  Serial.begin(9600);
  
  pinMode(A3, INPUT_PULLUP);
  pinMode(A4, INPUT_PULLUP);
  
}

void loop(){
  int a3=0;
  int a4=0;
  for(int i=0;i<10;i++){
   a3+=analogRead(A3); 
   a4+=analogRead(A4);
  }
  float c1=a3/10.0;
  float c2=a4/10.0;
  Serial.print("A3: ");
  Serial.print(c1);
  Serial.print("\t  A4: ");
  Serial.println(c2);
  
  delay(100);
  
}
