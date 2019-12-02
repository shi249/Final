"use-strict";

window.onload = function (){

    var w = 600;
    var h = 800;

    const small_msm = {
        width: 600,
        height: 500,
        marginAll: 80,
        marginLeft: 80
    }

    //Set color scale
    var color = d3.scaleThreshold()
                    .domain([90, 92, 94, 96, 98])
                    .range(['#fdae61','#fee08b','#d9ef8b','#a6d96a','#66bd63','#1a9850']); //from ColorBrewer
                            
    //Load geojson data	
    d3.json("neighbourhoods.geojson", function(json) { 
    
    //Load Listing b&b points
    d3.csv("listings.csv", function(points) {

    //Load  Listing Average data
    d3.csv("neighborhoodaverages.csv", function(data) {


	//Function to merge json data with airbnb data for desired month/year 		

	for (var i = 0; i < data.length; i++) {

		//Grab neighborhood and average rating
		var csvneighborhood = data[i].Neighborhood;
		var ratingValue = +data[i]['Average Rating'];
		
		//Find corresponding neighborhood inside the GeoJSON and merge the csv data
		for (var j = 0; j < json.features.length; j++) {
			
			//get json neighborhood
			var jsonneighborhood = json.features[j].properties.neighbourhood;		
			if (csvneighborhood == jsonneighborhood) {
				json.features[j].properties.averating = ratingValue;

				break; //Stop looking through the JSON
			}
		}
	}						    
    
    // project the geojson and generate the map
    var projection = d3.geoMercator().fitSize([w, h], json); 
    var path = d3.geoPath().projection(projection);	
    
    var svg = d3.select("body")
                .append("svg")
                .attr("id", "seattlemap")
                .attr("width", w)
                .attr("height", h);		    
        
    var maps = svg.selectAll("g")
                    .data(json.features)
                    .enter()    
								
                        
        //create background map with color
    var backgroundmap = maps.append("path")
                    .attr("d", path)
                    .attr("class", "zip-borders")
                    .attr("fill",function(d){
                        if(+d.properties.averating>0){
                            return color(+d.properties.averating);
                        } else {
                            return "darkgray";
                        }
                    })
                        
        //plot listings as points
    var listings = svg.selectAll("circle")
                        .data(points)
                        .enter()
                        .append("circle")
                        .attr("cx",function(d,i){
                            return projection([+d.longitude,+d.latitude])[0];
                        })
                        .attr("cy",function(d){
                            return projection([+d.longitude,+d.latitude])[1];
                        })
                        .attr("r",1.5)
                        .attr("opacity",function(d){
                            return 30/d.availability_365
                        });
                    
    //Create invisible map to cover points and make highlighting neighborhoods better

    var mapcover = maps.append("path")
                    .attr("d", path)
                    .attr("class", "zip-borders")
                    .attr("fill",function(d){
                        if(+d.properties.averating>0){
                            return color(+d.properties.averating);
                        } else {
                            return "darkgray";
                        }
                    })
                    .attr("opacity",0)
                    .on("mouseover",function(d){   
                    d3.select(this).classed("highlighted",true);

                    // Create tooltip
					var x = d3.event.pageX + 50 ;
                    var y = d3.event.pageY + 10;

                    var div = d3.select("#tooltip")
                            .style("opacity", 0.9)	

                    var toolchart = div.append('svg').attr('width', small_msm.width).attr('height', small_msm.height)
                    div.style("left", x + "px")
                    .style("top", y + "px") 
                    // plot bar chart
                    plotroomtype(d.properties.neighbourhood, toolchart)

                })
                .on("mouseout",function(){					
                    d3.select(this).classed("highlighted",false);
                    d3.select("#tooltip").style("opacity",0);
                    d3.select("#tooltip").selectAll("*").remove()
                    })

        // create dropbox to filter data
        var dropDown = d3.select("#filter").append("select")
        .attr("name", "room_type");

        var opt = 'select'

        var defaultOption = dropDown.append("option")
            .data(points)
            .text("All")
            .attr("value", "select")
            .classed("default", true)
            .enter();

        var options = dropDown.selectAll("option.room_type")
            .data(d3.map(points, function(d){return d.room_type;}).keys())
            .enter()
            .append("option");

        options.text(function (d) { return d; })
        .attr("value", function (d) { return d; });

        dropDown.on("change", function() {
        var selected = this.value;
        let displayOthers = this.checked ? "inline" : "none";
        let display = this.checked ? "none" : "inline";

        listings.filter(function(d) {if(selected == 'select'){return d.room_type != d.room_type}  return selected != d.room_type;})
        .attr("display", displayOthers);

        listings.filter(function(d) {if (selected == 'select'){return d.room_type == d.room_type} return selected == d.room_type;})
        .attr("display", display);

        });

        // Create colors legend
        var colorlegend = svg.selectAll("rect")
                            .data(color.range())
                            .enter()
                            .append("rect")
                            .attr("x", w*7/8)
                            .attr("y", function(d,i) {
                                    return  [85,90, 92, 94, 96, 98][i]*10 -h*.7; 
                            })
                            .attr("width", 20)
                            .attr("height", function(d,i){
                                    return [5,2,2,2,2,2][i]*10; //Height is difference between ith and (i-1)th threshold values
                            })
                            .attr("fill",function(d,i) {
                                    return ['#fdae61','#fee08b','#d9ef8b','#a6d96a','#66bd63','#1a9850'][i];
                            });					
    
        var ticklabels = [90, 92, 94, 96, 98,100]
        var colorlegendticks = svg.selectAll("text")
                            .data(ticklabels)
                            .enter()
                            .append("text")
                            .attr("text-anchor","left")
                            .attr("x", w*7/8 + 21)
                            .attr("y", function(d,i) {
                                    return [90, 92, 94, 96, 98,100][i]*10 -h*.7+3;
                            })
                            .text(function(d) {
                                    return d;
                            })
                            .attr("font-size",10)
                            .attr("font-family","helvetica");	
    
        svg.append("text")
            .attr("x",w*7/8)
            .attr("y",h*3/5)
            .attr("font-size",11)
            .attr("font-weight","bold")					
            .text("Average");
        svg.append("text")
            .attr("x",w*7/8)
            .attr("y",h*3/5+12)
            .attr("font-size",11)
            .attr("font-weight","bold")					
            .text("Rating");

// make barchart

function plotroomtype(neighbourhood, toolchart) {

        // data = points.filter(function(d) {d["neighbourhood"] == neighbourhood})
        var bardata = points.filter(function(d) { return d.neighbourhood_cleansed == neighbourhood }) 

        var countRoomType = d3.nest()
        .key(function (d) {return d["room_type"]; })
        .rollup(function(v) { return v.length;})
        .entries(bardata);

        // set the ranges
        var x = d3.scaleBand()
            .range([0 + small_msm.marginAll, small_msm.width - small_msm.marginAll])
            .padding(0.1);
        var y = d3.scaleLinear()
            .range([small_msm.height-small_msm.marginAll, small_msm.marginAll]);

        plotBar(countRoomType)
        console.log()
    
       // format the data
       function plotBar(data){
        data.forEach(function(d) {
        d.value = +d.value;
        });

        // Scale the range of the data in the domains
        x.domain(data.map(function(d) { return d.key; }));
        y.domain([0, d3.max(data, function(d) { return d.value; })]);
        
        // draw axis lines
        let xAxis = d3.axisBottom(x)

        let yAxis = d3.axisLeft(y)

        // append the rectangles for the bar chart
        toolchart.selectAll(".bar")
        .data(data)
        .enter().append("g")
        .attr("class", "bars")
        .append("rect")
        .attr("class", "bar")
        .attr("x", function(d) { return x(d.key); })
        .attr("width", x.bandwidth())
        .attr("y", function(d) { return y(d.value); })
        .attr("height", function(d) { return small_msm.height - y(d.value) - small_msm.marginAll; })
        .style("fill", "steelblue");

        // add label
        var bars = toolchart.selectAll(".bars");
            bars.append("text")
            .attr("class", "label")
            .attr("y", function(d) { return y(d.value) - 5; })
            .attr("x", function(d) { return x(d.key) + x.bandwidth()/2; })
            .text(function(d) { return d.value; })
            .style('font-size', '8pt');

        // add the x Axis
        toolchart.append("g")
        .attr("transform", "translate(0,420)")
        // .call(d3.axisBottom(x));
        .call(xAxis)

        // add the y Axis
        toolchart.append("g")
        .attr("transform", "translate(80,0)")
        // .call(d3.axisLeft(y));
        .call(yAxis);

        // draw title and axis labels
        toolchart.append('text')
            .attr('x', 250)
            .attr('y', 470)
            .style('font-size', '10pt')
            .text("Room Type");

        toolchart.append('text')
            .attr('transform', 'translate(35, 300)rotate(-90)')
            .style('font-size', '10pt')
            .text('Count of Room Type');

        toolchart.append('text')
            .attr('x', 100)
            .attr('y', 50)
            .style('font-size', '10pt')
            .text("Bar Chart: Number of Each Room Type for "+ neighbourhood);       

        }      
        }



    });		
    });	
    });	
};		
        
    
