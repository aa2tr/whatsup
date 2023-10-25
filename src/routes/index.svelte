<script context="module">
	export const prerender = false;

</script>

<script>
    import * as satellite from 'satellite.js';
	import { onMount } from 'svelte';
    import { Table, Styles, Container, Row, Col, Navbar, NavbarBrand, Nav, NavItem, NavLink, Alert } from 'sveltestrap';
    import { Modal, ModalBody, ModalHeader, ModalFooter } from 'sveltestrap';
    import { FormGroup, Label, Input, FormText, Button } from 'sveltestrap';

    import strftime from 'strftime';
    import HamGridSquare from './HamGridSquare.js';

    let data = {
        timestamp : 0,
        satellites : [ ],
    };

    let position = {
        latitude : 40.88855,
        longitude : -74.94444,
        maidenhead : 'FN30iv',

        // Has the position ever been changed?
        changed : true,

        // Should the position dialog be shown?
        show : false
    };

    // The location of the observer, as latitude and longitude.
    let observerGeo;

    function updatePosition() {
        observerGeo = {
            latitude: satellite.degreesToRadians(position.latitude || 0),
            longitude: satellite.degreesToRadians(position.longitude || 0),
            height: 0.030, // km
        };
    }

    function updateMaidenhead() {
        try {
            position.maidenhead = HamGridSquare.fromLatLon(position.latitude || 0, position.longitude || 0);
        } catch (e) {
        }
    }

    updatePosition();

    function changePosition(ignoreMaidenhead) {
        position.changed = true;

        if (position.latitude && position.longitude) {
            localStorage.latitude = position.latitude;
            localStorage.longitude = position.longitude;
            localStorage.changed = position.changed;
        }

        updatePosition();

        if (ignoreMaidenhead !== true) {
            updateMaidenhead();
        }
    }

    function changeMaidenhead() {
        let latlon;

        try {
            latlon = HamGridSquare.toLatLon(position.maidenhead);
        } catch (e) {
            return;
        }

        position.latitude = +(latlon[0].toFixed(5));
        position.longitude = +(latlon[1].toFixed(5));

        changePosition(true);
    }


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
                unique: t.unique,
                norad: sat.norad,

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

        position.latitude = +(localStorage.latitude || 40.88855);
        position.longitude = +(localStorage.longitude || -74.94444);
        position.changed = localStorage.changed || false;

        updatePosition();
        updateMaidenhead();

        let response = await fetch("./data.json");
        data = await response.json();

        totalTransmitters = 0;

        // Convert the TLEs into sarecs.
        for (let i of data.satellites) {
            i.satrec = satellite.twoline2satrec(i.tle1, i.tle2);

            for (let t of i.transmitters) {
                totalTransmitters += 1;
                t.unique = totalTransmitters;
            }
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

.narrow-col {
    width: 3.5em;
}

.wide-col {
    width: 4em;
}

@media (min-width: 768px) {
    .narrow-col {
        width: 7em;
    }
    .wide-col {
        width: 10em;
    }

    .padded-col {
        padding-left: 1.5em;
    }
}

</style>

<Styles/>

<Navbar color="light" light>
    <NavbarBrand>🛰️ What's Up?</NavbarBrand>
</Navbar>

{#if ! position.changed}
<Alert color="warning">
Using the default location of Kings Park, NY. <a href="#" on:click|preventDefault={e => position.show = true}>Click here to change it.</a>
</Alert>
{/if}

<Container>
    <Table hover class="small table-sm">
        <colgroup>
            <col span="1" class="wide-col" />
            <col span="1" class="narrow-col" />
            <col span="1" class="narrow-col" />
            <col span="1">
        </colgroup>

        <thead>
        <tr class="right">
            <th><span class="d-none d-md-inline">Frequency</span><span class="d-md-none">MHz</span></th>
            <th>Az<span class="d-none d-md-inline">imuth</span></th>
            <th>El<span class="d-none d-md-inline">evation</span></th>
            <th>Norad</th>
            <th class="left padded-col">Satellite • Transmitter</th>
        </tr>
        </thead>

        <tbody class="right">

            {#each transmitters as t (t.unique)}
            <tr>
                <td>{ (t.frequency / 1e6).toFixed(3) }<span class="d-none d-md-inline">&nbsp; MHz</span></td>
                <td>{ t.azimuth.toFixed(1) }</td>
                <td>{ t.elevation.toFixed(1) }&nbsp;{#if t.rangeRate <= 0}▲{:else}▼{/if}</td>
                <td>{ t.norad }</td>
                <td class="left padded-col" >{ t.name } • { t.description }</td>
            </tr>
            {/each}

        </tbody>

    </Table>


    <Row class="small">

    <Col md="6">
        Displaying { strftime("%Y-%m-%d %H:%M:%S", now) }, in {timeToCalculateMs} ms.<br>
        Data from { strftime("%Y-%m-%d %H:%M:%S", new Date(data.timestamp)) }, { data.satellites.length } sats with { totalTransmitters } transmitters.<br>
        Latitude: { (position.latitude || 0).toFixed(5)}, Longitude: { (position.longitude || 0).toFixed(5) }
        (<a href="#" on:click|preventDefault={e => position.show = true}>Change</a>)
        <br>
    </Col>

    <Col md="6" class="d-none d-md-block" style="text-align: right">
        Orbital elements courtesy of <a href="https://celestrak.com/">Celestrak.com</a>.<br>
        Transmitter list courtesy of <a href="https://satnogs.org/">SATNOGS</a>.<br>
        <a href="https://github.com/kc2feb/whatsup">github.com/kc2feb/whatsup</a>
    </Col>

    <Col md="6" class="d-md-none" style="text-align: left">
        Orbital elements courtesy of <a href="https://celestrak.com/">Celestrak.com</a>.<br>
        Transmitter list courtesy of <a href="https://satnogs.org/">SATNOGS</a>.<br>
        <a href="https://github.com/kc2feb/whatsup">github.com/kc2feb/whatsup</a>
    </Col>

    </Row>

</Container>

<Modal isOpen={position.show}>
    <ModalHeader>
        Change Position
    </ModalHeader>

    <ModalBody>
        <FormGroup>
            <Label for="latitude">Latitude</Label>
            <Input type="number" name="latitude" id="latitude" bind:value={position.latitude} min="-90" max="90" step=".00001" on:change={changePosition} />
            <FormText>Negative numbers are in the southern hemisphere.</FormText>
        </FormGroup>

        <FormGroup>
            <Label for="longitude">Longitude</Label>
            <Input type="number" name="longitude" id="longitude" bind:value={position.longitude} min="-180" max="180" step=".00001" on:change={changePosition} />
            <FormText>Negative numbers are in the western hemisphere.</FormText>
        </FormGroup>


        <FormGroup>
            <Label for="maidenhead">Maidenhead Locator</Label>
            <Input type="text" name="maidenhead" id="maidenhead" bind:value={position.maidenhead} on:change={changeMaidenhead} />
            <FormText>A maidenhead grid square. <a href="https://www.levinecentral.com/ham/grid_square.php">More info.</a></FormText>
        </FormGroup>

    </ModalBody>

    <ModalFooter>
        <Button color="primary" on:click={ e => position.show = false }>Close</Button>
    </ModalFooter>


</Modal>
