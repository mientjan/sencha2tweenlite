define( [ 'CSSReader', 'ANIMWriter', 'CSSWriter', 'TweenliteWriter' ], function( CSSReader, ANIMWriter, CSSWriter, TweenliteWriter ){

	function Main(){

		window.URL = window.URL || window.webkitURL;

		var fileInput = $( 'input[type=file]' );
		this.filecontents = ko.observableArray();
		this.download = ko.observable( false );
		this.downloadElement = $( '#download' )[0];
		this.assetBasePath = ko.observable('../image/');
		this.result = ko.observable();
	}

	Main.prototype.getGreensockLibrary = function( fn ){
		var xhr = new XMLHttpRequest();
		xhr.open( 'GET', 'js/lib/greensock.js', true );
		xhr.overrideMimeType( 'text/plain; charset=x-user-defined' );

		xhr.onreadystatechange = function( e ){
			if( this.readyState == 4 && this.status == 200 ){
				fn(this.responseText);
			}
		};

		xhr.send();
	}

	Main.prototype.fileChange = function( model, e ){
		var el = e.target,
				self = this;

		switch( true ){
			case /\.anim/.test( el.files[0].name ) :
				
				var reader = new FileReader(),
					file = el.files[0];
			
				reader.onload = function( e ){
					
					var writer = new ANIMWriter( e.target.result );

					this.result( writer.parse().replace(/asset:\/\//g,this.assetBasePath()) );
				}.bind(this);
				
				reader.readAsText( file );
				
				break;
			/*	
			case /\.html/.test( el.files[0].name ) :
				
				var reader = new FileReader(),
					file = el.files[0];
				
				
				reader.onload = function( e ){
					
					var html = e.target.result.replace(/<script[\w\W]*>[\w\W]*<\/script>/, " ");
					var reader = new CSSReader( html );
				
					var css = new CSSWriter(reader).parse();
					var js = new TweenliteWriter(reader).parse();
					
					// console.log(css);
			
					this.result(js);
				}.bind(this);
				
				reader.readAsText( file );
				
				break;
				
			case /\.css/.test( el.files[0].name ) :
				
				var reader = new FileReader(),
					file = el.files[0];
				
				
				reader.onload = function( e ){
					
					var css = e.target.result,
						reader = new CSSReader( css ),
						css = new CSSWriter(reader).parse(),
						js = new TweenliteWriter(reader).parse();
					
					this.result(js + "\n\n--------\n\n" + css);
				}.bind(this);
				
				reader.readAsText( file );
				
				break;
			case /\.zip/.test( el.files[0].name ) :

				var reader = new FileReader(),
						file = el.files[0];

				reader.onload = function( e ){

					var newZip = new JSZip();
						assets = newZip.folder( 'assets' ),
						reader = null;

					try {

						var zip = new JSZip( e.target.result );

						Object.each( zip.files, function( entry ){
							
							// images
							if( /\.(gif|png|jpg)/.test( entry.name ) ){
								// console.log(entry.asText());
								assets.file(
										entry.name.substr( entry.name.lastIndexOf( '/' ) + 1 ),
										entry.asArrayBuffer(),
										{ binary: true }
								);
							} else if( /\.css/.test( entry.name ) ){
								reader = new CSSReader( entry.data ),
										writer = new TweenliteWriter( reader );

								assets.file( 'animation.js', writer.parse() );

								this.result( writer.parse() );
							} else if( /\.html/.test( entry.name ) ){

								var data = entry.data.replace(
										'<script type="text/javascript" src="controller.js"></script>',
										'<script type="text/javascript" src="assets/greensock.js"></script>'
										+ "\n"+'<link rel="stylesheet" type="text/css" href="assets/start.css">'
										+ "\n"+'<script type="text/javascript" src="assets/animation.js"></script>'
										+ "\n"+'<script type="text/javascript">window.onload = function(){  timeline.play(); }</script>' );

//								var reader = new CSSReader( entry.data ),
//									writer = new TweenliteWriter( reader );
//
								newZip.file( entry.name.substr( entry.name.lastIndexOf( '/' ) + 1 ), data );

							}

							// this.result( writer.parse() );

						}, this );

						this.getGreensockLibrary(function(response){
							
							assets.file('start.css', new CSSWriter(reader).parse() );
							assets.file('greensock.js', response);
							
							var blob = newZip.generate( { type: "blob" } );

							this.downloadElement.style.display = 'block';
							this.downloadElement.href = window.URL.createObjectURL( blob );
							this.downloadElement.download = "converted.zip";
						
						}.bind(this));

						// newZip.generate({type:"blob"});

						// end of the magic !

					} catch( e ){
						console.log( e );
					}
				}.bind( this );

				reader.readAsArrayBuffer( file );

				break;*/
		}



//		switch(  el.files[0].type ){
//			case 'application/zip':
//				readZipFile( el.files[0], function( item ){
//					this.filecontents( item );
//					
//					Array.each( item, function( entry ){
//						
//						if( /\.css/.test( entry.filename ) ){
//							console.log(entry);
//							entry.getData( new zip.TextWriter( "text/plain" ), function( data )
//							{
//								var reader = new CSSReader( data ),
//									writer = new TweenliteWriter( reader );
//
//								this.result( writer.parse() );
//							}.bind(this));
//						}
//					}, this);
//				}.bind(this));
//			break;
//		}
//		if( el.files[0].type == 'application/zip' )
//		{
//			
//		}

	};


	ko.applyBindings( new Main() );
} );

String.prototype.count = function( q ){
	if( this.length <= 0 || q.length <= 0 ){
		return -1;
	}

	var i = 0, p = 0;
	var step = q.length;

	while( true ){
		p = this.indexOf( q, p );
		if( p >= 0 ){
			i++;
			p += step;
		} else
			break;
	}
	return i;
};

String.prototype.findBefore = function( query, index ){
	if( this.length <= 0 || query.length <= 0 ){
		return -1;
	}

	var i = 0,
			p = -1,
			step = query.length,
			str = this.substr( 0, index );

	while( true ){
		index = -step;
		p = str.indexOf( query, index );

		if( p > -1 || index < 1 ){
			return p;
		}
	}
	return i;
};