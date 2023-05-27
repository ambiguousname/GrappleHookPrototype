precision mediump float;

varying vec2 outTexCoord;

void main(){
    // vec2 f  = (mod(outTexCoord * 100.0 - fract(outTexCoord * 100.0),50.0))/50.0;

	if (abs(outTexCoord.x - 0.5) < 0.3) {
		
		gl_FragColor = vec4(0.6, 0.56, 0.56, 1.0);
	} else {
		gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
	}
}