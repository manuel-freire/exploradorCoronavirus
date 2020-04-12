let dataset = {}

const ccaa1Color = "steelblue";
const ccaa2Color = "red";
const regions = {};
/*  Generate code and hand-fix accents
            Object.keys(d.InformesDiarios[0].ComunidadesAutonomas)
              .map(o => ("regions['" + o.name + "']").padEnd(30) 
                + " = {"
                + "name: '" + (o.name + "'").padEnd(22) + "," 
                + "gdppc: " + "0".padStart(10) + ","
                + "pop: " + "0".padStart(10) + "};"
                ).join("\n").toString();
            and copy over data from (dated Jan 2019)
            https://es.wikipedia.org/wiki/Anexo:Comunidades_y_ciudades_aut%C3%B3nomas_de_Espa%C3%B1a
*/
regions['Andalucia']           = {name: 'Andalucía'             , gdppc:    18470,pop:    8426405};
regions['Aragon']              = {name: 'Aragón'                , gdppc:    27403,pop:    1320794};
regions['Canarias']            = {name: 'Canarias'              , gdppc:    20425,pop:    2207225};
regions['Cantabria']           = {name: 'Cantabria'             , gdppc:    22513,pop:     581684};
regions['CastillayLeon']       = {name: 'Castilla y Leon'       , gdppc:    21727,pop:    2408083};
regions['CastillaLaMancha']    = {name: 'Castilla-La Mancha'    , gdppc:    19681,pop:    2035505};
regions['Cataluna']            = {name: 'Cataluña'              , gdppc:    29936,pop:    7565099};
regions['Ceuta']               = {name: 'Ceuta'                 , gdppc:    19524,pop:      84843};
regions['Madrid']              = {name: 'Comunidad de Madrid'   , gdppc:    33809,pop:    6640705};
regions['ComunidadValenciana'] = {name: 'Comunidad Valenciana'  , gdppc:    22055,pop:    4974475};
regions['Extremadura']         = {name: 'Extremadura'           , gdppc:    17262,pop:    1065371};
regions['Galicia']             = {name: 'Galicia'               , gdppc:    22497,pop:    2700330};
regions['Baleares']            = {name: 'Islas Baleares'        , gdppc:    25772,pop:    1187808};
regions['LaRioja']             = {name: 'La Rioja'              , gdppc:    23555,pop:     313582};
regions['Melilla']             = {name: 'Melilla'               , gdppc:    17945,pop:      84714};
regions['Navarra']             = {name: 'Navarra'               , gdppc:    30914,pop:     653846};
regions['PaisVasco']           = {name: 'País Vasco'            , gdppc:    33088,pop:    2178048};
regions['Asturias']            = {name: 'Principado de Asturias', gdppc:    22046,pop:    1022293};
regions['Murcia']              = {name: 'Región de Murcia'      , gdppc:    20585,pop:    1487698};
regions['Todas']               = {name: 'Todas las CCAAs'       , gdppc:    23161,pop:   46284662};

$(() => {
    const offline = false; // set to true to use local dataset - requires local dataset & a local server
    const datasetUrl = offline ? 
        "../Coronavirus-Spain-Dataset/DataSet.json" : 
        "https://raw.githubusercontent.com/AlbertoCasasOrtiz/Coronavirus-Spain-Dataset/master/DataSet.json";
    
    $("#colorBox1").css("background-color", ccaa1Color);
    $("#colorBox2").css("background-color", ccaa2Color);
    
    $.getJSON(datasetUrl, (d) => {
        
        dataset = d;
        d.regions = regions;

        // initialize region dropdowns
        for (let regionKey of Object.keys(regions)) {
            $(".ccaa").append(
                $("<option value='" + regionKey + "'>" + regions[regionKey].name + "</option>")
            )
        }
        
        // initialize other drop-downs
        $("#yAxis").val("factor");
        $("#ccaa1").val("Madrid");
        $("#ccaa2").val("Todas");
        $("#column").val("Casos");

        // update last date in dataset
        $("#ultimaFecha").text(d.InformesDiarios[d.InformesDiarios.length - 1].Fecha);

        // listen to UI selections
        $("select").change(e => update());

        // and show currently-selected data
        update();
    })
});

// output: {name: "Madrid", values:
//    [{ date: Date Fri Jan 31 2020 00:00:00 GMT+0100 (Central European Standard Time), value: 0 }, ... ]}
function filterRegion(d, region, column) {
    return {
        name: region, values: d.InformesDiarios.map(i => {
            return {
                date: d3.timeParse("%Y-%m-%d")(i.Fecha),
                value: i.ComunidadesAutonomas[region][column]
            }
        })
    };
}

function allRegions(d, column) {
    return {
        name: "Todas", values: d.InformesDiarios.map(i => {
            return {
                date: d3.timeParse("%Y-%m-%d")(i.Fecha),
                value: i["Total" + column]
            }
        })
    }
}

// input: values (for a region)
// output: same; skips 'days' days, and generates (d_i - d_(i-n))/ d_(i-n) as values
function calculateIncrementFactor(ds, days) {
    const dayInMillis = 24 * 60 * 60 * 1000;
    const halfDayInMilis = dayInMillis / 2; // leap hours suck
    for (let i=ds.length-1; i>= 0; i--) {
        let current = ds[i];
        let valid = false;
        let previous = null;
        let targetDate = current.date.getTime() - days*dayInMillis;
        for (let j=i-days; j<i && j>=0; j++) { // days may be missing
            if (targetDate > ds[j].date.getTime() - halfDayInMilis &&
                targetDate < ds[j].date.getTime() + halfDayInMilis) {
               previous = ds[j];
               break;
            }
        }
        if (previous != null) {
            const p = previous.value;
            const c = current.value;
            if (Number.isFinite(p) && p != 0 &&  Number.isFinite(c)) {
                current.details = 
                    c + " - " + 
                    p + " = " +
                    (c - p);
                current.value = (c - p) / p
                valid = true;
            }
        }
        if ( ! valid) {
            // console.log("no valid data for " + targetDate, current.date);
            ds[i] = null;
        }
    }
    return ds.filter(o => o != null); // retain only valid values
}

// adjusts values for 1k-population
function adjustPer1kPop(d, regionKey) {
    for (let p of d) {
        let f = regions[regionKey].pop / 1000;
        p.details = p.value + " / " 
                + Number.parseFloat(f/1000).toFixed(3) + " M";
        p.value = p.value / f;               
    }
}

// adds tooltips to points
function addTooltips(d) {
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    for (let p of d) {
        p.tooltip = [
            p.date.toLocaleDateString('es-ES',options),
            Number.isFinite(p.value) ? Number.parseFloat(p.value).toFixed(3) : "No disponible"
        ];
        if (p.details) p.tooltip.push(p.details);
    }
}

function update() {
    let increments = ($("#yAxis").val() === "factor");
    let per1k = ($("#yAxis").val() === "per1k");
    if (increments) {
        $(".interval").show();
    } else {
        $(".interval").hide();
    }

    let c1 = $("#ccaa1").val();
    let c2 = $("#ccaa2").val();
    let days = +$("#days").val();
    let col = $("#column").val();

    dataset.regionCounts = [];
    dataset.regionCounts = Object.keys(regions)
        .filter( r => r !== "Todas") // special treatment
        .map(r => filterRegion(dataset, r, col));
    dataset.regionCounts.push(allRegions(dataset, col));
    console.log(dataset.regionCounts)

    console.log("Plotting data for ", c1, "vs", c2, 
        "increments? = ", increments, days, 
        "per1k? = ", per1k,
        "using", ccaa1Color, ccaa2Color);
    let d1 = dataset.regionCounts.find(rc => rc.name == c1).values;
    let d2 = dataset.regionCounts.find(rc => rc.name == c2).values;

    if (increments) {
        d1 = calculateIncrementFactor(d1, days);
        d2 = calculateIncrementFactor(d2, days);
    }
    if (per1k) {
        adjustPer1kPop(d1, c1);
        adjustPer1kPop(d2, c2);
    }
    [d1, d2].forEach(d => addTooltips(d));
    drawRegions(d1, d2, ccaa1Color, ccaa2Color);
}

// d is result of filterRegion: an array of {date:, value:} objects
function drawRegions(data1, data2, color1, color2) {

    console.log(data1, data2);
    $("#lineas").empty();

    let allData = data1.concat(data2);

    let margin = { top: 10, right: 30, bottom: 50, left: 60 },
        width = 800 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    let svg = d3.select("#lineas")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    // Add X axis --> it is a date format
    let x = d3.scaleTime()
        .domain(d3.extent(allData, function (d) { return d.date; }))
        .range([0, width]);
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x).ticks(20))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-65)");

    let y = d3.scaleSymlog()
        .domain([
            Math.min(0, d3.min(allData, function(d) { return +d.value; })), 
            d3.max(allData, function(d) { return +d.value; })
        ])
        .constant(4)
        .range([height, 0])

    svg.append("g")
        .call(d3.axisLeft(y).ticks(32, "1s"));

    paint(data1, d3.color(color1))
    paint(data2, d3.color(color2))

    // ready the tooltip div (see https://bl.ocks.org/d3noob/a22c42db65eb00d4e369)
    let div = d3.select("body").append("div")	
        .attr("class", "tooltip")				
        .style("opacity", 0);

    // paints 1 line & prepares its tooltips
    function paint(data, color) {
        // Add the line
        svg.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", color)
            .attr("stroke-width", 1.5)
            .attr("d", d3.line()
                .x(function (d) { return x(d.date) })
                .y(function (d) { return y(d.value) })
            )

        // Add the points & bind tooltips
        svg.selectAll("dot")	
            .data(data)			
        .enter().append("circle")								
            .attr("r", 4)		
            .attr("cx", function(d) { return x(d.date); })		 
            .attr("cy", function(d) { return y(d.value); })		
            .on("mouseover", function(d) {		
                div.transition()		
                    .duration(200)		
                    .style("opacity", .9);		
                div	.html(d.tooltip.join("<br/>"))
                    .style("color", color)
                    .style("left", (d3.event.pageX) + "px")		
                    .style("top", (d3.event.pageY - 28) + "px")	
                })					
            .on("mouseout", function(d) {		
                div.transition()		
                    .duration(500)		
                    .style("opacity", 0);	
            });
    }
}