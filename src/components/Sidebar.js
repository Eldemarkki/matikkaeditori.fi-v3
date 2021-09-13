/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
/* eslint-disable no-unreachable */
import React, { useRef } from "react"
import PropTypes from "prop-types"
import "../css/sidebar.css"
import formatDate from "../utils/date"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPlus, faFolder, faEllipsisH } from "@fortawesome/free-solid-svg-icons"
import { faFolder as faOutlineFolder } from "@fortawesome/free-regular-svg-icons"
import useActiveItem from "../utils/useActiveItem"
import Dropdown from "./Dropdown"
import { useEffect } from "react/cjs/react.development"

function FilesystemItem(props) {
    if (!props.data) return null

    
    useEffect(() => {
        if (props.createdItem == props.data.i && props.data.t == 1) {
            console.log("KHINKALYA", props.createdItem)

            folderTitleRef.current.focus()
            document.execCommand("selectAll",false,null)
        }
    }, [props.createdItem])
    
    const folderTitleRef = useRef()
    async function saveFolderTitle(event) {
        event.target.blur()
        document.getElementById("editor-element").focus()
        event.preventDefault()

        console.log("[ SIDEBAR ] Updating folder title...")

        if (event.target.innerText.trim() == "") {
            event.target.innerText = "Nimetön kansio"
        }

        let copy = [...props.level]
        let i = copy.findIndex(item => item.i === props.data.i)
        copy[i].name = event.target.innerText
        props.setLevel(copy)  // save client-side

        await window.internal.workers.api("Filesystem", "write", {
            instance: window.internal.ui.activeFilesystemInstance,
            id: props.data.i,
            write: {
                name: event.target.innerText,
                type: 1
            }
        })
    }
    const dropdownData = [
        {
            text: "Uudelleennimeä",
            action: () => {
                if (props.data.t == 0) {
                    document.getElementById("documentTitle").focus()
                    document.execCommand("selectAll",false,null)
                } else {
                    folderTitleRef.current.focus()
                    document.execCommand("selectAll",false,null)
                }
            }
        },
        {
            text: "Monista",
            action: () => {}
        },
        {
            text: "Poista",
            action: () => {
                // Note: Should there be a dialog to ask if you are sure?
                console.log("IN", props.data)
                if(confirm("Haluatko varmasti poistaa \"" + props.data.name + "\"?")){
                    props.deleteDocument(props.data.i)
                }
            }
        },
        {
            text: "Eliminoi", // tähä sellane hauska jekku et se tekee saman ku poista mut antaa full screen räjähdyksen äänen kaa
            action: () => {}
        },
        {
            text: "Näytä ID",
            action: () => {alert(props.data.i)}
        }
    ]

    if (props.data.t == 1) { // folder
        return (
            <li className={"fsFolder" + (props.selected ? " selected" : "")} onClick={props.onClick}>
                {/*<div className="fsIcon">
                    <FontAwesomeIcon icon={faOutlineFolder} />
                </div>*/}
                <div className="content">
                    <span
                        className="editableName"
                        spellCheck={false} 
                        contentEditable={true} 
                        suppressContentEditableWarning={true} 
                        ref={folderTitleRef}
                        onKeyDown={(event) => {if (event.key == "Enter") {saveFolderTitle(event)}} } 
                        onBlur={(event) => {saveFolderTitle(event)}}
                    >{props.data.name}</span>
                </div>
                <div className="action">
                    <Dropdown data={dropdownData} origin="left">
                        <button className="ellipsis">
                            <FontAwesomeIcon icon={faEllipsisH} />
                        </button>
                    </Dropdown>
                </div>
            </li>
        )
    } else if (props.data.t == 0) { // file
        return (
            <li className={(props.selected ? "selected" : "")} onClick={props.onClick}>
                <div className="content">
                    <span>{props.data.name}</span>
                    <span className="date">{props.data.date ? formatDate(props.data.date).pretty : ""}</span>
                    
                </div>
                <div className="action">
                    <Dropdown data={dropdownData} origin="left">
                        <button className="ellipsis">
                            <FontAwesomeIcon icon={faEllipsisH} />
                        </button>
                    </Dropdown>
                </div>
            </li>
        )
    }
}

const filesystemItemType = {
    selected: PropTypes.bool,
    data: PropTypes.object
}
FilesystemItem.propTypes = filesystemItemType

export default function Sidebar(props) {
    // todo implement subtrees
    const level = (props.level ? [...props.level] : null)
    
    const [activeItemData] = useActiveItem(props.activeItem, props.level, props.setLevel)

    if (level) level.reverse()


    const open = async (item) => {
        // to-do: save document before unload.
        if (item.t == 0) {
            props.setActiveItem(item.i)
        } else if (item.t == 1) {
            props.openFolder(item.i, item.name)
        }
    }

    return (
        <div className="sidebar" style={props.style}>
            <div className="head">
                <button className="primary" onClick={() => {props.newFsItem(0)}}>
                    <FontAwesomeIcon icon={faPlus} />&nbsp;
                    Uusi vastaus
                </button>
                <button className="folderSmall" onClick={() => {props.newFsItem(1)}}>
                    <FontAwesomeIcon icon={faFolder} />
                </button>
            </div>
            <ul className="filesystemLevel">
                {level ? level.map((item) => {
                    const selected = activeItemData?.i == item.i

                    return <FilesystemItem createdItem={props.createdItem} level={props.level} setLevel={props.setLevel} deleteDocument={props.deleteDocument} key={item.i} data={selected ? activeItemData : item} selected={selected} onClick={() => open(item)}
                    />
                }) : null}
            </ul>
        </div>
    )
}
