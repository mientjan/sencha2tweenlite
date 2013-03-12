define(function(){

	function Property(name, value, parent, basic){
		basic = basic || false;
		this.name = name;
		this.enabled = false;

		if(typeof(value) != 'undefined'){
			this.enabled = typeof(value.enabled) == 'undefined' ? true : value.enabled;
		}
		
		if( this.enabled ){
			switch(true){
				case /scene-endtime/.test(name) && this.enabled:

					this.enabled = false;
					break;
				case /custom-css/.test(name) && this.enabled:
					value.value.split(';').forEach(function(css){
						if(css == ""){
							return;
						}
						css = css.split(':');

						this.properties[css[0]] = new Property(css[0], css[1]);
					}, parent);
					this.enabled = false;
					break;
				case /object-text/.test(name):
				case /scene-description/.test(name):
				case /object-name/.test(name):
				case /keyframe-time/.test(name):
				case /keyframe-easing/.test(name):
					this.enabled = false;
					break;
				case /-color/.test(name):
					this.value = 'rgba(' + [value.r, value.g, value.b, value.a].join(',') + ')';
					break;
				case /object-image/.test(name):
					parent.src = value.src;
					this.enabled = false;
					break;
				case /background-image/.test(name):
					this.value = 'url(' + value.src + ')';

					break;
				case /translate3d/.test(name):
					// parent.properties[name] = {};
					parent.properties['position'] = new Property('position', 'absolute');
					if(!basic){
						parent.properties['x'] = new Property('x', value.x);
						parent.properties['y'] = new Property('y', value.y);
						parent.properties['z'] = new Property('z', value.z);
					} else {
						parent.properties['left'] = new Property('left', value.x);
						parent.properties['top'] = new Property('top', value.y);
					}
					this.enabled = false;
					break;
				case /scale3d/.test(name):


						if(!basic){
							parent.properties['scaleX'] = new Property('scaleX', value.x);
							parent.properties['scaleY'] = new Property('scaleY', value.y);
							parent.properties['scaleZ'] = new Property('scaleZ', value.z);
						} else {

							parent.properties['scaleX'] = new Property('scaleX', value.x);
							parent.properties['scaleY'] = new Property('scaleY', value.y);
						}
						this.enabled = false;
						break;

					case /border-/.test(name):
							this.enabled = false;
					this.value = value.width + 'px ' + value.line + ' rgba(' + [value.r, value.g, value.b, value.a].join(',') + ')';
					break;
				case /rotate$/.test(name):
					// parent.properties[name] = {};
					parent.properties['rotateX'] = new Property('rotateX', value.x);
					parent.properties['rotateY'] = new Property('rotateY', value.y);
					parent.properties['rotateZ'] = new Property('rotateZ', value.z);

					this.enabled = false;
					break;

				default:
					this.value = typeof(value) == 'object' ? value.value : value;
					break;
			}
		}
	}

	Property.prototype.name = '';
	Property.prototype.value = '';
	Property.prototype.enabled = true;

	function Keyframe(kf){
		this.time = 0;
		this.properties = {};
		this.easing = '';

		Object.each(kf.properties, function(value, name){
			if(/keyframe-easing/.test(name)){
				this.easing = Keyframe.EASINGTYPE[value.type];
			} else if(/keyframe-time/.test(name)){
				this.time = value.value;
			} else {
				value = new Property(name, value, this);
				if(value.enabled){
					this.properties[value.name] = value;
				}
			}
		}, this);

		if(this.properties['position']){
			delete this.properties['position'];
		}
	}

	Keyframe.EASINGTYPE = [
		null,
		null,
		'Power2.linear',
		'Power2.easeIn',
		'Power2.easeOut',
		'Power2.easeInOut'
	];

	function Keyframes(keyframes, el)
	{
		this.el = el;
		this.data = [];

		keyframes.each(function(keyframe, index){
			this.push(new Keyframe(keyframe));
		}, this.data);
	}

	function Element(el, scope){

		this.type = el.type || '';
		this.properties = {};
		this.children = [];
		this.keyframes = [];

		if(el.properties){
			Object.each(el.properties, function(value, name){

				if(name == 'object-cssid'){
					this.name = value.value;
				} else {

					// name = name.replace(/x/, 'left');
					// name = name.replace(/y/, 'top');

					value = new Property(name, value, this, true);
					if(value.enabled){
						this.properties[value.name] = value;
					}
				}
			}, this);
		}

		if(this.name == ''){
			console.warn('you forgot a name', this);
		}

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
			this.children.push(new Element(element, scope))
		}, this);

		// keyframes
		if(el.keyframes){

			if(el.keyframes.length > 1){
				this.keyframes = new Keyframes(el.keyframes, this);
				scope.animations.push(this.keyframes);
			}

//			// set first part of the key frame as property
			if(el.keyframes[0]
					&& el.keyframes[0].properties
					&& el.keyframes[0].properties['keyframe-time']
					&& el.keyframes[0].properties['keyframe-time'].value == 0
					&& el.keyframes[0].properties['keyframe-time'].enabled
					){

				Object.each(el.keyframes[0].properties, function(value, name){

					value = new Property(name, value, this);
					if(value.enabled){
						this.properties[value.name] = value;
					}

				}, this);
			}

		}
	}

	Element.prototype.name = '';
	Element.prototype.type = '';
	Element.prototype.children = null;
	Element.prototype.properties = null;
	Element.prototype.keyframes = null;

	function ANIMWriter(rawData){

		this.rawData = rawData;
		this.data = JSON.decode(rawData);

		this.all = [];
		this.animations = [];
		this.css = [];
		this.elements = [];

		this.data.scenes.forEach(function(element){
			this.elements.push(new Element(element, this));
		}, this);

	}

	ANIMWriter.prototype.useBasic = false;

	function generateElementHtml(elements){
		var el = null, response = '', data = [];
		for(var i = 0, l = elements.length; i < l; ++i){
			el = elements[i];
			response = '';


			if(el.children.length > 0){
				response = generateElementHtml(el.children);
			}


			switch(el.type){
				case 'image':
					{

						data.push('<img id="' + el.name + '" src="' + el.src + '" />')
						break;
					}
				default:
					{
						data.push('<div id="' + el.name + '">' + response + '</div>')
						break;
					}
			}

		}

		return data.join("\n");
	}

	function generateStyleSheet(elements, formatForOldBrowsers, firstNode )
	{
		var el = null, data = [];
		for(var i = 0, l = elements.length; i < l; ++i){
			el = elements[i];

			if(el.children.length > 0){
				data.push(generateStyleSheet(el.children, formatForOldBrowsers));
			}

			var transformProperties = {},
					properties = {};


			// console.log(el.name, el.properties);
			Object.each(el.properties, function(property, name){

				if( firstNode && (/background-color/.test(name) || /border-color/.test(name)) ){
					return;
				}

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
						if(!formatForOldBrowsers){
							if(!transformProperties['translate3d']){
								transformProperties['translate3d'] = {};
							}

							transformProperties['translate3d'][property.name] = property.value;
						} else if(/^[xy]$/.test(property.name)){
							properties[
									property.name.replace(/[x]/, 'left').replace(/[y]/, 'top')
							] = property.value + 'px';
						}
						break;
					case 'rotateX':
					case 'rotateY':
					case 'rotateZ':
					case 'rotate':
						transformProperties[property.name] = property.value + 'deg';
						break
					case 'scale':
					case 'scale3d':
					case 'scaleX':
					case 'scaleY':
					case 'scaleZ':
						property.name = property.name.replace(/rotateZ/, 'rotate');
						property.name = property.name.replace(/scaleZ/, 'scale');
						transformProperties[property.name] = property.value;
						break
					case 'left':
					case 'top':
						if(!transformProperties['translate3d']){
							transformProperties['translate3d'] = {'x': 0, 'y': 0, 'z': 0};
						}

						properties[property.name] = property.value + 'px';
						break
					case 'height':
					case 'width':
						properties[property.name] = property.value + 'px';
						break
					default:
						properties[property.name] = property.value;
						break

				}
			});

			var stylesheet = [];
			Object.each(properties, function(value, name){
				stylesheet.push([name, value].join(':'));
			});

			if(!formatForOldBrowsers && Object.getLength(transformProperties) > 0)
			{
				var transformAll = [],
						transformIE9 = [];

				Object.each(transformProperties, function(value, name){
					switch(name){
						case 'translate3d':
							transformAll.push(name + '(' + [value.x, value.y, value.z].join('px,') + 'px)');
							transformIE9.push('translate(' + [value.x, value.y].join('px,') + 'px)');
							break;
						default:
							transformAll.push(name + '(' + value + ')');
							transformIE9.push(name + '(' + value + ')');
							break;
					}
				});

				stylesheet.push('-webkit-transform: ' + transformAll.join(' '));
				stylesheet.push('-ms-transform: ' + transformAll.join(' '));
				stylesheet.push('-ms-transform: ' + transformIE9.join(' '));
				stylesheet.push('-moz-transform: ' + transformAll.join(' '));
				stylesheet.push('transform: ' + transformAll.join(' '));
			}
			// console.log(formatForOldBrowsers);
			if(!formatForOldBrowsers){
				data.push('#' + el.name + " {\n\t" + stylesheet.join(";\n\t") + "\n}\n");
			} else {
				data.push('.oldie #' + el.name + " {\n\t" + stylesheet.join(";\n\t") + "\n}\n");
			}

		}
		// console.log(data);
		return data.join("\n");
	}

	function generateJs(multipleKeyframes, formatForOldBrowsers){

		var el = null,
				response = "",
				offset = 0,
				timeline = [],
				labels = [],
				element = [],
				keyframeA = null,
				keyframeB = null;

		// response += "$(document).ready(function(){";
		// response += "\n\tvar timeline = timeline || new TimelineLite();";
		// response += "\n\tvar offset = offset || 0;";

		for(var a = 0, l1 = multipleKeyframes.length; a < l1; ++a){
			keyframes = multipleKeyframes[a];

			var totalTime = 0,
				prevTime = 0,
				offsetTime = 0,
				data = '';

			if(keyframes.data.length > 0)
			{
				for(var b = 0, l2 = keyframes.data.length; b < l2; ++b)
				{
					keyframeA = keyframes.data[b];
					keyframeB = keyframes.data[b + 1];

					if(typeof(keyframeB) == 'undefined'){
						break;
					}
					
					if( keyframeA.properties['label'] ){
						labels.push('timeline.addLabel(\'' + keyframeA.properties['label'].value + '\', '+keyframeA.time+');');
					}
					
					if(b == 0){
						offsetTime = 0.001;
						data = 'timeline.to('
								+ "$('#" + keyframes.el.name + "'), "
								+ offsetTime + ", "
								+ generateJs.formatProperties(keyframeA, formatForOldBrowsers) + ', '
								+ (0)
								+ ');';
	
						timeline.push(data);
					}
					
					
					
					data = 'timeline.to('
							+ "$('#" + keyframes.el.name + "'), "
							+ (keyframeB.time - keyframeA.time) + ", "
							+ generateJs.formatProperties(keyframeB, formatForOldBrowsers) + ', '
							// + "(offset + " + (prevTime + offsetTime) + ")"
							+ (prevTime + offsetTime) 
							+ ');';
//
					timeline.push(data);

					prevTime += (keyframeB.time - keyframeA.time);

				}
			}
		}

		response += "\n\t" + labels.join("\n\t");
		response += "\n\t" + timeline.join("\n\t");
		

		return response;
	}

	generateJs.formatProperties = function(keyframe, formatForOldBrowsers){
		var properties = {};
		Object.each(keyframe.properties, function(property, name){
			if(/rotate/.test(name)){
				name = name.replace(/rotate/, 'rotation');
			}

			if(formatForOldBrowsers){
				
				switch(true){
					case /[xy]/.test(name):
						name = name.replace(/^x$/, 'left');
						name = name.replace(/^y$/, 'top');
					break;
					
					case /^z$/.test(name):
					case /^scaleZ/.test(name):
						return;
						break;
					
				}
				
			}

			this[name] = property.value;
		}, properties);

		if(keyframe.easing != ''){
			properties['ease'] = keyframe.easing;
		}

		// easing
		properties = JSON.stringify(properties);
		return properties.replace(new RegExp('"ease":"' + keyframe.easing + '"'), 'ease:' + keyframe.easing + '');
	}


	ANIMWriter.prototype.parse = function(){

		var result = {};
		
		result.css = '';
		result.css += generateStyleSheet(this.elements, true, true );
		result.css += generateStyleSheet(this.elements, false, true );
		
		result.html = generateElementHtml(this.elements);
		
		var js = "var timeline = new TimelineLite();\n";
			js += "timeline.pause();\n";
			js += "if( Browser.ie && Browser.version < 9 ){\n";
			js += generateJs(this.animations, true ) + "\n"
			js += "} else {\n";
			js += generateJs(this.animations, false ) + "\n"
			js += "}";
			
		result.js = js;

		return result;
	}


	return ANIMWriter;
});
