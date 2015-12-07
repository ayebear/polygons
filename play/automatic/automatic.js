//Garbage collectors modifications to the parable of the polygons
//Notable modifications:
//Added ding sound to signal end of simulation
//Added green hexagon
//Modified statistics output
//Made the background a picture of a map
// Option to control the satisfaction threshold with sliders

var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

var stats_canvas = document.getElementById("stats_canvas");
var stats_ctx = stats_canvas.getContext("2d");

//Ding sound to be used to signal the end of the simulation (satisfaction point)
var ding = new Audio("../audio/ding.mp3");


//initialize bias to 1/3, artifact of original
var NONCONFORM = {
	triangle: 1.00,
	square: 1.00,
	hexagon: 1.00
};
var BIAS = {
	triangle: 0.33,
	square: 0.33,
	hexagon: 0.33
};
var TILE_SIZE = 30;
var PEEP_SIZE = 30;
var GRID_SIZE = 20;
var DIAGONAL_SQUARED = (TILE_SIZE+5)*(TILE_SIZE+5) + (TILE_SIZE+5)*(TILE_SIZE+5);


//Default ratio of shapes for startup
window.RATIO_TRIANGLES = 0.25;
window.RATIO_SQUARES = 0.25;
window.RATIO_HEXAGONS = 0.25;
window.EMPTINESS = 0.25;


var assetsLeft = 0;
var onImageLoaded = function(){
	assetsLeft--;
};

var images = {};
function addAsset(name,src){
	assetsLeft++;
	images[name] = new Image();
	images[name].onload = onImageLoaded;
	images[name].src = src;
}

//Adding our images to the node so they can have all the emotions
addAsset("yayTriangle","../img/yay_triangle.png");
addAsset("mehTriangle","../img/meh_triangle.png");
addAsset("sadTriangle","../img/sad_triangle.png");
addAsset("yaySquare","../img/yay_square.png");
addAsset("mehSquare","../img/meh_square.png");
addAsset("sadSquare","../img/sad_square.png");
addAsset("yayHexagon","../img/yay_hexagon.png");
addAsset("mehHexagon","../img/meh_hexagon.png");
addAsset("sadHexagon","../img/sad_hexagon.png");

//initializing variables for drag and drop functionality
var IS_PICKING_UP = false;
var lastMouseX, lastMouseY;

//This portion gives the functionality to drag and drop pieces, dangling them while you move them
function Draggable(x,y){

	var self = this;
	self.x = x;
	self.y = y;
	self.gotoX = x;
	self.gotoY = y;

	var offsetX, offsetY;
	var pickupX, pickupY;
	self.pickup = function(){
		//This means they're picking things up
		IS_PICKING_UP = true;

		pickupX = (Math.floor(self.x/TILE_SIZE)+0.5)*TILE_SIZE;
		pickupY = (Math.floor(self.y/TILE_SIZE)+0.5)*TILE_SIZE;
		offsetX = Mouse.x-self.x;
		offsetY = Mouse.y-self.y;
		self.dragged = true;

		// Dangle the shape
		self.dangle = 0;
		self.dangleVel = 0;

		// Draw on top
		var index = draggables.indexOf(self);
		draggables.splice(index,1);
		draggables.push(self);

	};

	//Dropping the pieces on the board
	self.drop = function(){

		//You're not picking it up anymore if you're dropping it
		IS_PICKING_UP = false;

		//All of this math adjusts the coordinates based on tile size and grid size
		var px = Math.floor(Mouse.x/TILE_SIZE);
		var py = Math.floor(Mouse.y/TILE_SIZE);
		if(px<0) px=0;
		if(px>=GRID_SIZE) px=GRID_SIZE-1;
		if(py<0) py=0;
		if(py>=GRID_SIZE) py=GRID_SIZE-1;
		var potentialX = (px+0.5)*TILE_SIZE;
		var potentialY = (py+0.5)*TILE_SIZE;

		//Making sure that the space you're placing the shape on isnt already used
		var spotTaken = false;
		for(var i=0;i<draggables.length;i++){
			var d = draggables[i];
			if(d==self) continue;
			var dx = d.x-potentialX;
			var dy = d.y-potentialY;
			if(dx*dx+dy*dy<10){
				spotTaken=true;
				break;
			}
		}
		//In this case the spot is already taken so go to back to pickup location
		if(spotTaken){
			self.gotoX = pickupX;
			self.gotoY = pickupY;
		}else{

			STATS.steps++;
			writeStats();

			//goto becomes the potential because the spot is free
			self.gotoX = potentialX;
			self.gotoY = potentialY;
		}

		//it isn't being dragged anymore because this whole part is over!
		self.dragged = false;

	}

	var lastPressed = false;
	self.update = function(){

		// Shakiness
		self.shaking = false;
		self.bored = false;

		//This means that the shape isn't currently being dragged
		if(!self.dragged){
			var neighbors = 0;
			var same = 0;
			for(var i=0;i<draggables.length;i++){
				var d = draggables[i];
				if(d==self) continue;
				var dx = d.x-self.x;
				var dy = d.y-self.y;
				if(dx*dx+dy*dy<DIAGONAL_SQUARED){

					//count how many neighbors the shape has in general
					neighbors++;

					//count how many of the shapes neighbors are the same color as it
					//We're going to need the ratio of neighbors:neighbors of same color
					if(d.color==self.color){
						same++;
					}
				}
			}
			//You only need to calculate this ratio if the shape actually has neighbors
			//the ratio is number of same neighbors/number total neighbors
			//this will give you the percentage of neighbors that are the same
			if(neighbors>0){
				self.sameness = (same/neighbors);
			}else{
				// In this case the shape didn't have neighbors so set the sameness to 1 because all this shape has is itself
				self.sameness = 1;
			}
			//Dealing with boredom and shakiness based on bias
			//the shape will shake if it is below the bias threshold or above the conformity threshold, both uncomfortable states
			if(self.sameness<BIAS.triangle || self.sameness>NONCONFORM.triangle){
				self.shaking = true;
			}
			//if all neighbors are the same it's bored
			if(self.sameness>0.99){
				self.bored = true;
			}
			//it won't shake if it doesnt have neighbors, it's alone
			if(neighbors==0){
				self.shaking = false;
			}
		}

		// Dragging
		if(!self.dragged){
			if((self.shaking||window.PICK_UP_ANYONE) && Mouse.pressed && !lastPressed){
				var dx = Mouse.x-self.x;
				var dy = Mouse.y-self.y;
				if(Math.abs(dx)<PEEP_SIZE/2 && Math.abs(dy)<PEEP_SIZE/2){
					self.pickup();
				}
			}
		}else{
			self.gotoX = Mouse.x - offsetX;
			self.gotoY = Mouse.y - offsetY;
			if(!Mouse.pressed){
				self.drop();
			}
		}
		lastPressed = Mouse.pressed;

		// Going to where you should
		self.x = self.x*0.5 + self.gotoX*0.5;
		self.y = self.y*0.5 + self.gotoY*0.5;

	};

	self.frame = 0;
	self.draw = function(){
		ctx.save();
		ctx.translate(self.x,self.y);

		//Defining shaking and how it looks
		if(self.shaking){
			self.frame+=0.07;
			ctx.translate(0,20);
			ctx.rotate(Math.sin(self.frame-(self.x+self.y)/200)*Math.PI*0.05);
			ctx.translate(0,-20);
		}

		// Draw thing
		var img;
		if(self.color=="triangle"){
			if(self.shaking){
				img = images.sadTriangle;
			}else if(self.bored){
				img = images.mehTriangle;
			}else{
				img = images.yayTriangle;
			}
		}else if(self.color=="square"){
			if(self.shaking){
				img = images.sadSquare;
			}else if(self.bored){
				img = images.mehSquare;
			}else{
				img = images.yaySquare;
			}
		}else{
			if(self.shaking){
				img = images.sadHexagon;
			}else if(self.bored){
				img = images.mehHexagon;
			}else{
				img = images.yayHexagon;
			}
		}

		// Dangle
		if(self.dragged){
			self.dangle += (lastMouseX-Mouse.x)/100;
			ctx.rotate(-self.dangle);
			self.dangleVel += self.dangle*(-0.02);
			self.dangle += self.dangleVel;
			self.dangle *= 0.9;
		}

		ctx.drawImage(img,-PEEP_SIZE/2,-PEEP_SIZE/2,PEEP_SIZE,PEEP_SIZE);
		ctx.restore();
	};

}

window.START_SIM = false;

var draggables;
var STATS;
window.reset = function(){

	STATS = {
		steps:0,
		offset:0
	};
	START_SIM = false;

	stats_ctx.clearRect(0,0,stats_canvas.width,stats_canvas.height);

	draggables = [];
	for(var x=0;x<GRID_SIZE;x++){
		for(var y=0;y<GRID_SIZE;y++){
			var rand = Math.random();
			if(rand<(1-window.EMPTINESS)){
				var draggable = new Draggable((x+0.5)*TILE_SIZE, (y+0.5)*TILE_SIZE);
				if(rand<window.RATIO_TRIANGLES){
					draggable.color = "triangle";
				}else if(rand<(window.RATIO_TRIANGLES+window.RATIO_SQUARES)){
					draggable.color = "square";
				}else{
					draggable.color = "hexagon";
				}
				draggables.push(draggable);
			}
		}
	}

	// Write stats for first time
	for(var i=0;i<draggables.length;i++){
		draggables[i].update();
	}
	writeStats();

}

window.render = function(){

	if(assetsLeft>0 || !draggables) return;

	// Is Stepping
	if(START_SIM){
		step();
	}

	// Draw
	Mouse.isOverDraggable = IS_PICKING_UP;
	ctx.clearRect(0,0,canvas.width,canvas.height);
	for(var i=0;i<draggables.length;i++){
		var d = draggables[i];
		d.update();

		if(d.shaking || window.PICK_UP_ANYONE){
			var dx = Mouse.x-d.x;
			var dy = Mouse.y-d.y;
			if(Math.abs(dx)<PEEP_SIZE/2 && Math.abs(dy)<PEEP_SIZE/2){
				Mouse.isOverDraggable = true;
			}
		}

	}
	for(var i=0;i<draggables.length;i++){
		draggables[i].draw();
	}

	// Done stepping End simulation play the ding and you're done
	if(isDone()){
		doneBuffer--;
		if(doneBuffer==0){
			doneAnimFrame = 30;
			START_SIM = false;
			console.log("DONE");
			ding.play();
			writeStats();
		}
	}else if(START_SIM){
		//Keep going you're not done
		STATS.steps++;
		doneBuffer = 30;

		// Write stats to update graph
		writeStats();

	}
	if(doneAnimFrame>0){
		doneAnimFrame--;
		var opacity = ((doneAnimFrame%15)/15)*0.2;
		canvas.style.background = "rgba(255,255,255,"+opacity+")";
	}else{
		canvas.style.background = "none";
	}

	// Mouse
	lastMouseX = Mouse.x;
	lastMouseY = Mouse.y;

}

//Dealing with text definition for sliders and stats
var segregation_text = document.getElementById("segregation_text");
if(!segregation_text){
	var segregation_text = document.getElementById("stats_text");
}
var shaking_text = document.getElementById("sad_text");
var bored_text = document.getElementById("meh_text");

var tmp_stats = document.createElement("canvas");
tmp_stats.width = stats_canvas.width;
tmp_stats.height = stats_canvas.height;

window.writeStats = function(){

	if(!draggables || draggables.length==0) return;

	var graphHeight = 100;

	// Average Sameness Ratio
	// Average shaking
	// Average bored
	var total = 0;
	var total_shake = 0;
	var total_bored = 0;
	for(var i=0;i<draggables.length;i++){
		var d = draggables[i];
		total += d.sameness || 0;
		total_shake += (d.shaking?1:0);
		total_bored += (d.bored?1:0);
	}
	var avg = total/draggables.length;
	var avg_shake = total_shake/draggables.length;
	var avg_bored = total_bored/draggables.length;
	var avg_happy = (draggables.length - (total_shake + total_bored)) / draggables.length;
	if(isNaN(avg)) debugger;

	// If stats oversteps, bump back
	if(STATS.steps>graphHeight+STATS.offset){
		STATS.offset += 120;
		var tctx = tmp_stats.getContext("2d");
		tctx.clearRect(0,0,tmp_stats.width,tmp_stats.height);
		tctx.drawImage(stats_canvas,0,0);
		stats_ctx.clearRect(0,0,stats_canvas.width,stats_canvas.height);
		stats_ctx.drawImage(tmp_stats,-119,0);
	}

	// AVG -> SEGREGATION
	var segregation = (avg-0.5)*2;
	var segregation = avg;
	if(segregation<0) segregation=0;

	// Graph it
	stats_ctx.fillStyle = "#cc2727";
	var x = STATS.steps - STATS.offset;
	var y = graphHeight - segregation*graphHeight+10;
	stats_ctx.fillRect(x,y,1,5);
	// Text
	segregation_text.innerHTML = Math.floor(segregation*100)+"% segregation";
	segregation_text.style.top = Math.round(y-10)+"px";
	segregation_text.style.left = Math.round(x+35)+"px";

	stats_ctx.fillStyle = "#2727cc";
	y = graphHeight - avg_happy*graphHeight+10;
	stats_ctx.fillRect(x,y,1,5);
	// Text
	if(shaking_text){
		shaking_text.innerHTML = Math.floor(avg_happy*100)+"% happy";
		shaking_text.style.top = Math.round(y-10)+"px";
		shaking_text.style.left = Math.round(x+35)+"px";
	}

	stats_ctx.fillStyle = "#cccc27";
	y = graphHeight - avg_bored*graphHeight+10;
	stats_ctx.fillRect(x,y,1,5);
	// Text
	if(bored_text){
	bored_text.innerHTML = Math.floor(avg_bored*100)+"% meh";
	bored_text.style.top = Math.round(y-10)+"px";
	bored_text.style.left = Math.round(x+35)+"px";
	}

	// Button
	if(START_SIM){
		document.getElementById("moving").classList.add("moving");
	}else{
		document.getElementById("moving").classList.remove("moving");
	}

}

var doneAnimFrame = 0;
var doneBuffer = 30;
function isDone(){
	if(Mouse.pressed) return false;
	for(var i=0;i<draggables.length;i++){
		var d = draggables[i];
		if(d.shaking) return false;
	}
	return true;
}

function step(){

	// Get all shakers
	var shaking = [];
	for(var i=0;i<draggables.length;i++){
		var d = draggables[i];
		if(d.shaking) shaking.push(d);
	}

	// Pick a random shaker
	if(shaking.length==0) return;
	var shaker = shaking[Math.floor(Math.random()*shaking.length)];

	// Go through every spot, get all empty ones
	var empties = [];
	for(var x=0;x<GRID_SIZE;x++){
		for(var y=0;y<GRID_SIZE;y++){

			var spot = {
				x: (x+0.5)*TILE_SIZE,
				y: (y+0.5)*TILE_SIZE
			}

			var spotTaken = false;
			for(var i=0;i<draggables.length;i++){
				var d = draggables[i];
				var dx = d.gotoX-spot.x;
				var dy = d.gotoY-spot.y;
				if(dx*dx+dy*dy<10){
					spotTaken=true;
					break;
				}
			}

			if(!spotTaken){
				empties.push(spot);
			}

		}
	}

	// Go to a random empty spot
	var spot = empties[Math.floor(Math.random()*empties.length)];
	if(!spot) return;
	shaker.gotoX = spot.x;
	shaker.gotoY = spot.y;

}

////////////////////
// ANIMATION LOOP //
////////////////////
window.requestAnimFrame = window.requestAnimationFrame ||
	window.webkitRequestAnimationFrame ||
	window.mozRequestAnimationFrame ||
	function(callback){ window.setTimeout(callback, 1000/60); };
(function animloop(){
	requestAnimFrame(animloop);
	if(window.IS_IN_SIGHT){
		render();
	}
})();

window.IS_IN_SIGHT = false;

window.onload=function(){
	reset();
}
