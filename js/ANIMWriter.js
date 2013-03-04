 define(function(){

	function Property(name, value, parent){
		this.name = name;
		
		switch( true ){
			case /-color/.test(name):
				this.value = 'rgba('+[value.r,value.g,value.b,value.a].join(',')+')';
				break;
			case /object-image/.test(name):
				parent.src = value.src;
				return false;
				break;
			case /background-image/.test(name):
				this.value = 'url('+value.src+')';
				
				break;
			case /translate3d/.test(name):
				parent.properties.push(new Property('x', value.x));
				parent.properties.push(new Property('y', value.y));
				parent.properties.push(new Property('z', value.z));
				return false;
				break;
			case /border-/.test(name):
				this.value = value.width + 'px ' + value.line + ' rgba('+[value.r,value.g,value.b,value.a].join(',')+')';
				break;
			case /object-text/.test(name):
			case /object-name/.test(name):
			case /keyframe-easing/.test(name):
				return false;
				break;
			case /rotate$/.test(name):
				parent.properties.push(new Property('rotateX', value.x));
				parent.properties.push(new Property('rotateY', value.y));
				parent.properties.push(new Property('rotateZ', value.z));
				return false;
				break;

			default:
				this.value = typeof(value) == 'object' ? value.value : value;
				break;
		}
	}
	
	function Keyframe(kf){
		this.time = 0;
		this.properties = [];
		
		Object.each(kf.properties, function(prop, name){
			if(/keyframe-time/.test(name)){
				this.time = prop.value;
			} else {
				prop = new Property(name,prop, this);
				if(prop){
					this.properties.push(prop);
				}
			}
		}, this);
	}
	
	function Keyframes(keyframes, el)
	{
		this.el = el;
		this.properties = [];
		
		keyframes.each(function(keyframe, index){
			this.push(new Keyframe(keyframe) );
		}, this.properties);
	}
	
	function Element(el, scope){
		
		this.type = el.type || '';
		this.properties = [];
		this.children = [];
		this.keyframes = [];
		
		Object.each(el.properties, function(value, name){
			
			if( name == 'object-cssid'){
				this.name = value.value;
			} else {
				value = new Property(name, value, this);
				if(value){
					this.properties.push(value);
				}
			}
		}, this );
		
		console.log(this.name);
		
		switch(this.type){
			case 'image':
			case 'text':
				data = el.children;
				break;
			default:
				data = el.data.children;
				break;
		}
		
		data.each(function(element){
			this.children.push( new Element(element, scope) )
		}, this);
		
		// keyframes
		if(el.keyframes){
			this.keyframes = new Keyframes(el.keyframes, this);
			scope.animations.push(this.keyframes);
		}
	}
	
	Element.prototype.name = '';
	Element.prototype.type = '';
	Element.prototype.children = null;
	Element.prototype.properties = null;
	Element.prototype.keyframes = null;

	function ANIMWriter( rawData ){
		
		this.rawData = rawData;
		this.data = JSON.decode(rawData);
		
		this.all = [];
		this.animations = [];
		this.css = [];
		this.elements = [];
		
		this.data.scenes.forEach(function(element){
			this.elements.push( new Element(element, this) );
		}, this);
	}
	
	function generateElementHtml(elements){
		var el = null, response = '', data = [];
		for( var i = 0,l=elements.length;i<l;++i){
			el = elements[i];
			response = '';
			

			if(el.children.length>0){
				response = generateElementHtml(el.children);
			}
			
			
			switch( el.type ){
				case 'image':{
					
					data.push('<img id="'+el.name+'" src="'+el.src+'" />')
					break;
				}
				default:{
					data.push('<div id="'+el.name+'">'+response+'</div>')
					break;
				}
			}
			
		}
		
		return data.join("\n");
	}
	
	function generateStyleSheet(elements){
		var el = null, data = [];
		for( var i = 0,l=elements.length;i<l;++i){
			el = elements[i];

			if(el.children.length>0){
				data.push( generateStyleSheet(el.children) );
			}
			
			var transformProperties = {},
				defaultProperties = [];
		
			el.properties.each(function(property){
				switch(property.name){
					case 'object-name':
					case 'object-text':
					case 'object-image':
					case 'object-cssclass':
					case 'anchor':
					case 'rotate':
					case 'translate3d':
						break;
					case 'x':
					case 'y':
					case 'z':
						if(!transformProperties['translate3d']){
							transformProperties['translate3d'] = {};
						}
						
						transformProperties['translate3d'][property.name] = property.value;
						
						break;
					case 'rotateX':
					case 'rotateY':
					case 'rotateZ':
						
						transformProperties[property.name] = property.value + 'deg';
						
						break;
					case 'rotate':
					case 'scale':
					case 'scale3d':
						
						transformProperties[property.name] = property.value;
						break
					case 'height':
					case 'width':
						defaultProperties.push(property.name+': ' + property.value + 'px');
						break
					default:
						defaultProperties.push(property.name+': ' + property.value);
						break
					
				}
			})
			
			if(Object.getLength(transformProperties)>0){
				var transform = [];
				Object.each(transformProperties, function(value, name){
					switch(name){
						case 'translate3d':
							transform.push(name+'('+[value.x,value.y,value.z].join('px,')+'px)');
							break;
						default:
							transform.push(name+'('+value+')');
							break;
					}
				});
				
				defaultProperties.push('-webkit-transform: '+transform.join(' '));
				defaultProperties.push('-ms-transform: '+transform.join(' '));
				defaultProperties.push('-moz-transform: '+transform.join(' '));
				defaultProperties.push('transform: '+transform.join(' '));
			}
			
			data.push( '#'+el.name+" {\n\t"+defaultProperties.join(";\n\t") + "\n}\n");
			
		}
		
		return data.join("\n");
	}
	
		
	function generateJs(multipleKeyframes){
		
		var el = null, 
			response = "", 
			timeline = [],
			element = [];
	
		// response += "$(document).ready(function(){";
		response += "\n\tvar timeline = new TimelineLite();";
		
		
		for( var a = 0,l1=multipleKeyframes.length;a<l1;++a){
			keyframes = multipleKeyframes[a];
			
			for( var b = 0,l2=keyframes.properties.length;b<l2;++b){
				keyframe = keyframes.properties[b];
				
				var properties = {}
				for( var c = 0,l3=keyframe.properties.length;c<l3;++c){
					property = keyframe.properties[c];
					
					properties[property.name] = property.value;

				}
				timeline.push("timeline.add( TweenLite.to( $('#"+keyframes.el.name+"'), "+keyframe.time+", "+JSON.stringify(properties)+"), 0 );");
			}
		}
			
			// console.log(keyframe);
//			response = '';
//			
//
//			if(el.children.length>0){
//				response = generateElementHtml(el.children);
//			}
//			
//			
//			switch( el.type ){
//				case 'image':{
//					
//					data.push('<img id="'+el.name+'" src="'+el.src+'" />')
//					break;
//				}
//				default:{
//					data.push('<div id="'+el.name+'">'+response+'</div>')
//					break;
//				}
//			}
			
		
		response += "\n\t" + timeline.join("\n\t");
		response += "\n\t timeline.pause();";
		// response += "\n });";
		
		return response;
	}
	
	ANIMWriter.prototype.parse = function(){
		
		var cssElements = generateStyleSheet(this.elements);
		var htmlElements = generateElementHtml(this.elements);
		var jsElements = generateJs(this.animations);
		
		var response = "";
		
		response += "<style>"+cssElements+"</style>\n\n";
		response += "<script>\n";
		response += "$(document).ready(function(){\n\t"+jsElements+"\n});\n";
		response += "</script>\n";
		"</script>\n\n";
		response += htmlElements;
		
		
		return response; // + cssElements + htmlElements;
	}
	
	
	return ANIMWriter;
} );
