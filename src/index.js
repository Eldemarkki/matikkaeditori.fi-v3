// React libs
import React from "react"
import ReactDOM from "react-dom"
import "./css/index.css"
import App from "./App"

// Import static components
import * as c from "./js/worker-components/compatibility.js"
import error from "./js/error.js"
import upgrade from "./js/upgrade.js"
import * as Workers from "./js/workers.js"
// eslint-disable-next-line no-unused-vars
import * as uuid from "./js/worker-components/uuid.js" // This is used globally, not here though
import C from "./js/console"
import { console_config } from "./js/console"

// Global handler
async function G(){
    return new Promise(resolve => {
        // Declare globals
        // eslint-disable-next-line no-unused-vars
        window.internal = {
            workers: {
                list: {},
                handlers: {},
                shared: {},
                api: Workers.api
            },
            console: console_config(),
            ui: {
                activeFilesystemInstance: null,
                activeLocation: null,
                editor: null,
                saved: false
            },
            time_at_live: new Date().getTime(), // Time since code first started to run
            /**
             * --------------------------------------------------
             * Very important version field!
             * CHANGE TO HANDLE BREAKING CHANGES VIA "upgrade.js"
             * --------------------------------------------------
             */
            version: "beta",
            versionHash: ""
        }

        // Promise for UI to wait before doing anything
        window.internal.workers.essentials = new Promise((resolve) => {
            window.internal.workers.essentialsResolve = resolve
        })

        // Fetch version hash
        fetch("/VERSION")
            .then(res => res.text())
            .then(res => {
                if(res.startsWith("VERSION: ")){
                    window.internal.versionHash = res.split(": ")[1]
                }else {
                    window.internal.versionHash = "Development version"
                }
            }).catch(e => {
                window.internal.versionHash = "Unknown"
                console.error("Failed to get version number", e)
            })


        // User ID
        let id = localStorage.getItem("id")
        if(id == null){
            id = uuid.v4()
        }
        localStorage.setItem("id", id)
        window.id = id // This is used to salt all filesystem verity hashes. When cloud saves are implemented, this needs to be exported in to the cloud save location.

        // Handle version upgrades
        const current_version = localStorage.getItem("version")
        if(current_version !== null){
            if(current_version !== window.internal.version){
                if(typeof upgrade[current_version] !== "function"){
                    alert("Upgrading to \"" + window.internal.version + "\" from \"" + current_version + "\" is not possible at this time.")
                    window.location.reload()
                }
                upgrade[current_version]().then(() => {
                    console.log("Upgraded to " + window.internal.version)
                    // Run the console component here
                    C(window)
                    resolve()
                }).catch(e => {
                    console.error("[ Index ] Failed to upgrade: " + e.stack)
                }) 
            }else {
                console.log("No upgrades to be done. (" + current_version + ")")
                C(window)
                resolve()
            }
        }else {
            // Version is null
            if(localStorage.length > 1){
                console.error("[ Index ] Version is null!")
                if(confirm("Application version is unknown. Would you like to reset it?")){
                    localStorage.setItem("version", window.internal.version)
                    C(window)
                    resolve()
                }
            }else {
                localStorage.setItem("version", window.internal.version)
                C()
                resolve(window)
            }
        }
    })
}

// Debug stuff
/* eslint-disable no-unused-vars */
window.reset = async function () {
    // This deletes everything
    localStorage.clear()
    sessionStorage.clear()
    let cookies = document.cookie
    for (let i = 0; i < cookies.split(";").length; ++i){
        let myCookie = cookies[i]
        if(myCookie == undefined) continue
        let pos = myCookie.indexOf("=")
        let name = pos > -1 ? myCookie.substr(0, pos) : myCookie
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT"
    }
    if(typeof window.indexedDB.databases === "function"){
        // Chromium
        window.indexedDB.databases().then((r) => {
            for (var i = 0; i < r.length; i++) window.indexedDB.deleteDatabase(r[i].name)
        }).then(() => {
            window.location.reload()
        })
    }else {
        // Everything else
        alert("Please clear indexDB manually.")
    }
}

// Implement embedded worker api
// TODO: Remove from production!
window.api = async (worker, type, message) => {
    const req = await window.internal.workers.api(worker, type, message)
    console.log("Response:", req)
}

// Page close listener
window.addEventListener("beforeunload", e => {
    if(!window.internal.ui.saved){
        // Not saved yet!
        const confirmationMessage = "Jotain on vielä tallentamatta" + " Älä sulje vielä sivua!";
        (e || window.event).returnValue = confirmationMessage
        return confirmationMessage
    }
    return
});

(async () => {
    // MAIN
    try {
        // Check browser compatibility
        if(c.c()){
            console.log("Browser compatibility checks passed!")
            // Declare globals & Handle low-level setup (upgrades etc.)
            await G()

            // --- This is where the actual application code begins ---
            // Handle workers
            Workers.default()

            // Render
            ReactDOM.render(
                <React.StrictMode>
                    <App></App>
                </React.StrictMode>,
                document.getElementById("root")
            )
        }else {
            console.log("Incompatible browser!")
            ReactDOM.render(
                <React.StrictMode>
                    <p>Incompatible browser!</p>
                </React.StrictMode>,
                document.getElementById("root")
            )
        }
    }
    catch(err){
        error("Index", err)
    }
})()