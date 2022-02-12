<script context="module">
	export const prerender = false;

</script>

<script>
    import * as satellite from 'satellite.js';
	import { onMount } from 'svelte';
    import { Table, Styles, Container, Row, Col, Navbar, NavbarBrand } from 'sveltestrap';

    let data = {
        timestamp : 0,
        satellites : [ ],
    };


    // The location of the observer, as latitude and longitude.
    let observerGeo = {
        latitude: satellite.degreesToRadians(40.88855),
        longitude: satellite.degreesToRadians(-73.24355),
        height: 0.030,
    };

    // The same, but in ecf.
    let observerEcf;
    let observerEci;

    // The time as a java date, and as gmst.
    let now = new Date();
    let gmst;

    // The list of transmitters.
    let transmitters = [ ];

    // How long it took to calculate everything.
    let timeToCalculateMs = 0.0;

    // How many total transmitters are there?
    let totalTransmitters = 0;

    /**
     * Returns the range rate between the user and the satellite.
     */
    function rangeRate(location, position, velocity) {

        var mfactor = 7.292115E-5;
        var c = 299792.458; // Speed of light in km/s

        var range = {
            x: position.x - location.x,
            y: position.y - location.y,
            z: position.z - location.z
        };
        range.w = Math.sqrt(Math.pow(range.x, 2) + Math.pow(range.y, 2) + Math.pow(range.z, 2));
        var rangeVel = {
            x: velocity.x + mfactor * location.y,
            y: velocity.y - mfactor * location.x,
            z: velocity.z
        };

        var rangeRate = (range.x * rangeVel.x + range.y * rangeVel.y + range.z * rangeVel.z) / range.w;

        return rangeRate;
    }

    function propagateSat(sat) {

        let positionAndVelocity = satellite.propagate(sat.satrec, now);
        let positionEci = positionAndVelocity.position;
        let velocityEci = positionAndVelocity.velocity;

        if (positionEci === undefined || velocityEci === undefined) {
            return;
        }

        let positionEcf = satellite.eciToEcf(positionEci, gmst);
        let lookAngles = satellite.ecfToLookAngles(observerGeo, positionEcf)

        if (lookAngles.elevation < 0) {
            return;
        }

        let rr = rangeRate(observerEci, positionEci, velocityEci);

        let az = satellite.radiansToDegrees(lookAngles.azimuth);
        let el = satellite.radiansToDegrees(lookAngles.elevation);


        for (let t of sat.transmitters) {

            let frequency = t.frequency - t.frequency * ( rr / 299792.4580);

            transmitters.push({
                name: sat.name,
                frequency: frequency,
                azimuth: az,
                elevation: el,
                rangeRate: rr,
                description: t.description,
                mode: t.mode,

                sortKey: [ frequency, sat.name, t.description ],

            });
        }

    }


    function update() {
        now = new Date();
        gmst = satellite.gstime(now);

        observerEcf = satellite.geodeticToEcf(observerGeo);
        observerEci = satellite.ecfToEci(observerEcf, gmst);

        transmitters = [ ]


        for (let sat of data.satellites) {
            propagateSat(sat);
        };

        transmitters.sort((a, b) => {
            return a.frequency - b.frequency;
        });

        timeToCalculateMs = (+new Date() - +now);
    }


    onMount(async () => {

        let response = await fetch("/data.json");
        data = await response.json();

        totalTransmitters = 0;

        // Convert the TLEs into sarecs.
        for (let i of data.satellites) {
            i.satrec = satellite.twoline2satrec(i.tle1, i.tle2);
            totalTransmitters += i.transmitters.length;
        };

        update();

        setInterval(update, 1000);

    });

</script>

<style>
.right {
    text-align: right;
}

.left {
    text-align: left;
}

</style>


<Styles/>

<Navbar color="light" light>
    <NavbarBrand>🛰️ What's Up?</NavbarBrand>
</Navbar>

<Container>
    <Table hover class="small table-sm">
        <thead>
        <tr class="right">
            <th><span class="d-none d-md-inline">Frequency</span><span class="d-md-none">MHz</span></th>
            <th>Az<span class="d-none d-md-inline">imuth</span></th>
            <th>El<span class="d-none d-md-inline">evation</span></th>
            <th class="left">Satellite • Transmitter</th>
        </tr>
        </thead>

        <tbody class="right">

            {#each transmitters as t}
            <tr>
                <td>{ (t.frequency / 1e6).toFixed(3) }<span class="d-none d-sm-inline"> MHz</span></td>
                <td>{ t.azimuth.toFixed(1) }</td>
                <td>{ t.elevation.toFixed(1) }&nbsp;{#if t.rangeRate <= 0}▲{:else}▼{/if}</td>
                <td class="left">{ t.name } • { t.description }</td>
            </tr>
            {/each}

        </tbody>

    </Table>


    <Row class="small">

    <Col md="6">
        { now } - {timeToCalculateMs.toFixed(2)} ms<br>
        { data.satellites.length } satellites with { totalTransmitters } transmitters.
    </Col>

    <Col md="6" class="d-none d-md-block" style="text-align: right">
        Orbital elements courtesy of <a href="https://celestrak.com/">Celestrak.com</a><br>
        Transmitter list courtesy of <a href="https://satnogs.org/">SATNOGS</a>
    </Col>

    <Col md="6" class="d-md-none" style="text-align: left">
        Orbital elements courtesy of <a href="https://celestrak.com/">Celestrak.com</a><br>
        Transmitter list courtesy of <a href="https://satnogs.org/">SATNOGS</a>
    </Col>

    </Row>

</Container>
