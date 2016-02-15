
#define MOTOR_STEP_PIN 10
#define MOTOR_DIR_PIN 9
#define VACCUM_PIN 6
#define MICROWAVE_PIN 5
#define LIMIT_TOP_PIN A3
#define LIMIT_BOTTOM_PIN A2
#define EMERGENCY_PIN A5
#define CABLE1_PIN A0
#define CABLE2_PIN A1
#define CABLES_PIN A4

#define COMMAND_MOTOR_STOP 0
#define COMMAND_MOTOR_UP 1
#define COMMAND_MOTOR_DOWN 2
#define COMMAND_VACCUM_ON 3
#define COMMAND_VACCUM_OFF 4
#define COMMAND_MICROWAVE_ON 5
#define COMMAND_MICROWAVE_OFF 6


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
}

void loop(){
	if(Serial.available()>0){
		int byte = Serial.read();
		swtich(byte){
			case COMMAND_MOTOR_STOP:
				break;
			case COMMAND_MOTOR_UP:
				break;
		}
		
	}
}