
const fetch = require('node-fetch');//to be able to create a client

const express = require('express')

var bodyParser = require('body-parser')


const app = express()

app.use(bodyParser.urlencoded({ extended: true }))

app.set('view engine', 'ejs')

const SPARQL_QUERY_URL = process.env.SPARQL_QUERY_URL || 'http://localhost:8889/bigdata/sparql?query='

const BIO_ENDPOINT = 'https://cp.gigseekr.com/labs/user/update'
//const BIO_ENDPOINT = 'https://a75793cc.ngrok.io/labs/user/update'

var display = ""
var button_txt = "Send to STIM"

var description = "Imogen Heap is a technology innovator and award-winning recording artist. Writing and producing 4 albums, Heap has collaborated with recognised musicians including Jeff Beck, and Josh Groban, penned tracks for movies and TV shows and written the entire score for Harry Potter and the Cursed Child."

var biography = `
Counting 5 Grammy nominations, winning one for engineering and another for her contribution to Taylor Swift's '1989', Heap has received numerous awards including an Ivor Novello and an honorary Doctorate of Technology for her MI.MU gloves work: a ground-breaking gestural music making system.

In 2014 she started Mycelia and released 'Tiny Human', the first song to use smart contracts on a blockchain. With a vision of creating an artist-led, fair and sustainable decentralized music industry ecosystem, Mycelia's 'The Creative Passport’ provides an ID for music makers to connect digitally. Heap is currently bringing this vision to life on a year-long music and technology world tour. `

var newsong_title = ""


console.log("URL set to: " + SPARQL_QUERY_URL)

var songQuery = encodeURIComponent(`prefix dc: <http://purl.org/dc/elements/1.1/>
prefix owl: <http://www.w3.org/2002/07/owl#>
prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT DISTINCT ?trackName 
(GROUP_CONCAT(DISTINCT ?albumName; SEPARATOR = ", ") as ?albumNames) 
(GROUP_CONCAT(DISTINCT COUNT(?venueTitle)) as ?venueTitleCount)
WHERE {
  SELECT * {
  ?track a <http://www.creativepassport.agency/schema#track> ;
       dc:title ?trackName .
  OPTIONAL {
    ?album ?p ?x .
    ?x ?p1 ?track .
    ?album dc:title ?albumName .
    ?event ?p2 ?track ;
           <http://www.creativepassport.agency/property#has_venue> ?venue .
    ?venue dc:title ?venueTitle .
    }
        
  } ORDER BY ASC(?trackName) 
}

GROUP BY ?trackName LIMIT 10

`)

var albumQuery = encodeURIComponent(`
prefix dc: <http://purl.org/dc/elements/1.1/>
prefix owl: <http://www.w3.org/2002/07/owl#>
prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT DISTINCT ?albumName 
(GROUP_CONCAT(DISTINCT COUNT(?track)) as ?songCount)
WHERE {
  SELECT * {
  ?album a <http://www.creativepassport.agency/schema#album> ;
       dc:title ?albumName .
  OPTIONAL {
    ?album <http://www.creativepassport.agency/property#has_track> ?track .
    }
        
  } ORDER BY ASC(?albumName) 
}

GROUP BY ?albumName LIMIT 10

`)

var eventQuery = encodeURIComponent(`
prefix dc: <http://purl.org/dc/elements/1.1/>
prefix owl: <http://www.w3.org/2002/07/owl#>
prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
prefix cpp: <http://www.creativepassport.agency/property#>

SELECT DISTINCT ?event ?venueName ?timeStamp ?city ?country

WHERE {
  
  ?event a <https://schema.org/Event> .
  ?event cpp:has_venue ?venue .
  ?venue dc:title ?venueName .
  ?event <https://schema.org/startDate> ?timeStamp .
  OPTIONAL {
  	?venue cpp:has_city ?city ;
           cpp:has_country ?country ;  
  }
    
  } ORDER BY DESC(?timeStamp) LIMIT 10

`)

app.use('/assets', express.static('assets'))
app.use('/pages', express.static('pages'))

app.get('/bio', (req, res) => res.render('bio'))
app.get('/biography', (req, res) => res.render('biography', {biography: biography, description: description}))

app.get('/newsong', (req, res) => res.render('newsong'))
app.post('/newsong', (req, res) =>  {

    newsong_title = req.body.title
    res.render('newsong', {display: "disabled", message: "New Recording " + newsong_title + " submitted!"})

})


app.get('/stim', (req, res) => res.render('stim'))

app.post("/bio-action", (req, res) => {

    biography = req.body.long_bio
    description = req.body.short_bio

    res.render('biography', {biography: biography, description: description, message: "Biography updated", display: "disabled"})


    var content = {
        id: "9c0d4501-15bf-47c3-a7ee-3827c1bf1f68",
        desc: description,
        bio: biography
    }

    fetch(BIO_ENDPOINT, {headers: {"Content-Type":"application/json"}, method: "POST", body: JSON.stringify(content)})
        //.then(res.render('bio', {title: "Bio updated!"}))
})

app.post("/events", (req, res) => {
    fetch(SPARQL_QUERY_URL + eventQuery, {headers: {"Accept":"application/sparql-results+json"}})
        .then(res2 => res2.json())
        .then(body => {
            var bindings = body.results.bindings
            var results = []

            vibrate = true
            bindings.forEach((binding) => {
                var eventName = ""
                var source = "/assets/img/logo-viberate.svg"
                if (binding.venueName)
                    eventName += binding.venueName.value
                if (binding.city)
                    if (eventName != "")
                        eventName += ", "
                eventName += binding.city.value
                if (binding.country)
                    if (eventName != "")
                        eventName += ", "
                eventName += binding.country.value

                if (vibrate) {
                    vibrate = false
                    source = "//dgm-seekr.azureedge.net/logos/gigseekr_dark.svg"
                }
                else {
                    vibrate = true
                    source = "/assets/img/logo-viberate.svg"
                }

                results.push({"timeStamp": binding.timeStamp.value,
                    "eventTitle": eventName,
                    "source": source
                })

            })
            //res.send(results)
            display = "disabled"
            button_txt = "Processing at STIM"
            res.render('events', {title: "My great graph!", params: results, display: display, button_txt: button_txt})


        });
})

app.get('/songs', (req, res) => {
    fetch(SPARQL_QUERY_URL + songQuery, {headers: {"Accept":"application/sparql-results+json"}})
        .then(res2 => res2.json())
        .then(body => {
            var bindings = body.results.bindings
            var results = []
            bindings.forEach((binding) => {
                if (binding.albumNames)
                    if (binding.venueTitleCount)
                        results.push({"trackName": binding.trackName.value,
                            "albumNames": binding.albumNames.value,
                            "venueTitleCount": binding.venueTitleCount.value
                             })
                    else
                        results.push({"trackName": binding.trackName.value,
                            "albumNames": binding.albumNames.value
                        })

                else
                    results.push({"trackName": binding.trackName.value })
            })
            //res.send(results)

            if (newsong_title != "") {
                res.render('songs', {title: newsong_title, params: results})
            }
            else {
                res.render('songs', {params: results})
            }


        });

})

app.get('/albums', (req, res) => {
    fetch(SPARQL_QUERY_URL + albumQuery, {headers: {"Accept":"application/sparql-results+json"}})
        .then(res2 => res2.json())
        .then(body => {
            var bindings = body.results.bindings
            var results = []
            bindings.forEach((binding) => {
                if (binding.songCount)
                    results.push({"albumName": binding.albumName.value,
                        "songCount": binding.songCount.value
                    })
                else
                    results.push({"albumName": binding.albumName.value
                    })
            })
            //res.send(results)
            res.render('albums', {title: "My great graph!", params: results})
        });


})

app.get('/events', (req, res) => {
    fetch(SPARQL_QUERY_URL + eventQuery, {headers: {"Accept":"application/sparql-results+json"}})
        .then(res2 => res2.json())
        .then(body => {
            var bindings = body.results.bindings
            var results = []

            var vibrate = true
            bindings.forEach((binding) => {
                var eventName = ""
                var source = "/assets/img/logo-viberate.svg"
                if (binding.venueName)
                    eventName += binding.venueName.value
                if (binding.city)
                    if (eventName != "")
                        eventName += ", "
                    eventName += binding.city.value
                if (binding.country)
                    if (eventName != "")
                        eventName += ", "
                    eventName += binding.country.value

                if (vibrate) {
                    vibrate = false
                    source = "//dgm-seekr.azureedge.net/logos/gigseekr_dark.svg"
                }
                else {
                    vibrate = true
                    source = "/assets/img/logo-viberate.svg"
                }

                results.push({"timeStamp": binding.timeStamp.value,
                    "eventTitle": eventName,
                    "source": source
                })

            })
            //res.send(results)
            res.render('events', {title: "My great graph!", params: results, display: display, button_txt: button_txt})

        });


})





app.listen(3001, () => console.log('Example app listening on port 3001!'))