import { AlertCircle, DotSquareIcon, Download, DownloadCloudIcon, Moon, RefreshCcwIcon, Sun, Trash2, Trash2Icon } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSnippets } from './SnippetContext';
// import { InitialUserSetup } from './utils/auth/InitialUserSetup';
import { deleteUnsynced, loadUnsynced } from '../../Dexie/utils/sheetSyncHandlers';
import { dexieStore } from '../../Dexie/DexieStore';
import { Loading } from './utils/Loading';

const ExportIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="6" fill="currentColor" />
    <path d="M12 16V8M12 16L9 13M12 16L15 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ImportIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="6" fill="currentColor" />
    <path d="M12 8V16M12 8L9 11M12 8L15 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Settings = () => {
  const navigate = useNavigate();
  const { snippets, tags, setSnippets, setTags, toggleDarkMode, isDarkMode, userCreds, setUserCreds, setNotificationState, setSymbolDataSynced, setLoadingScreenState } = useSnippets();
  const [importError, setImportError] = useState(null);
  const [sheetUrlInput, setSheetUrlInput] = useState("")
  const [blockedSitesDisplay, setBlockedSitesDisplay] = useState([])

  const location = useLocation()

  useEffect(() => {
    chrome.storage.local.get(["blockedSites"]).then((val) => {
      setBlockedSitesDisplay(val.blockedSites || [])
    })
  }, [])

  useEffect(() => {
    if (location.hash) {
      const element = document.getElementById(location.hash.substring(1));
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [location]);

  const handleExport = () => {

    // Create CSV content
    const csvContent = [
      // CSV header
      ['Content', 'Tags', 'Created At', 'Updated At'].join(','),
      // CSV rows
      ...snippets.map(snippet => [
        `"${snippet.content.replace(/"/g, '""')}"`, // Escape quotes in content
        `"${snippet.tags.join(',')}"`, // Join tags with comma
        snippet.createdAt,
        snippet.updatedAt
      ].join(','))
    ].join('\n');

    // Create and download the CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'snippets_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csvData = e.target.result;
          const lines = csvData.split('\n').filter(line => line.trim() !== '');
          const importedSnippets = lines.slice(1).map(line => {
            const [content, tagsString, createdAt, updatedAt] = line.split(',').map(item => item.trim().replace(/^"|"$/g, ''));
            const snippetTags = tagsString.split(',').map(tag => tag.trim());
            return {
              id: Math.random().toString(36).substr(2, 9), // Generate a new ID
              content,
              tags: snippetTags,
              createdAt: createdAt || new Date().toISOString(),
              updatedAt: updatedAt || new Date().toISOString()
            };
          });

          // Update tags
          const newTags = new Set(tags);
          importedSnippets.forEach(snippet => {
            snippet.tags.forEach(tag => newTags.add(tag));
          });

          setSnippets([...snippets, ...importedSnippets]);
          setTags(Array.from(newTags));
          setImportError(null);
        } catch (error) {
          setImportError('Invalid file format or data');
        }
      };
      reader.readAsText(file);
    } else {
      setImportError('Please select a valid CSV file');
    }
  };


  async function generateSheetUrl() {

    const setup = await chrome.runtime.sendMessage({ msg: 'initialAuthSetup' })
    if (setup == 'doneSetup') {
      setNotificationState({ show: true, type: 'success', text: 'Registration successful!', duration: 3000 })
      chrome.storage.local.get(["userCreds"]).then((val) => {
        setUserCreds(val.userCreds)
      })

      //start syncing
      setSymbolDataSynced('syncing')
      chrome.runtime.sendMessage({ msg: 'startSyncing' }, (res) => {
        if (!res || res == 'error') return setSymbolDataSynced(false);
        res == 'success' ? setSymbolDataSynced(true) : null
      })
    } else { setNotificationState({ show: true, type: 'failure', text: 'Oops.. something went wrong! -check your connection!', duration: 3000 }) }

  }

  async function registerSheetUrl() {
    if (!sheetUrlInput) return setNotificationState({ show: true, type: 'warning', text: 'Enter a valid URL!', duration: 3000 });
    const sheetId = sheetUrlInput.match(/\/d\/([a-zA-Z0-9-_]+)(?:\/|$)/) ? sheetUrlInput.match(/\/d\/([a-zA-Z0-9-_]+)(?:\/|$)/)[1] : null
    if (!sheetId) return setNotificationState({ show: true, type: 'warning', text: 'Oops.. something went wrong!', duration: 3000 });

    await chrome.runtime.sendMessage({ msg: 'initialAuthSetup', registerExisting: true, payload: { sheetId } }).then((res) => {
      if (res == 'doneSetup') {
        setUserCreds({ sheetId })
        setNotificationState({ show: true, type: 'success', text: 'Sheet registered!', duration: 3000 })

        // start Syncing..
        setSymbolDataSynced('syncing')
        chrome.runtime.sendMessage({ msg: 'startSyncing' }, (res) => {
          if (!res || res == 'error') return setSymbolDataSynced(false);
          res == 'success' ? setSymbolDataSynced(true) : null
        })
      } else {
        setNotificationState({ show: true, type: 'failure', text: 'Oops.. something went wrong while registering sheet! -consider checking your connection!', duration: 3000 })
      }

    })

  }

  let justClickedLoadNse = false;

  return (
    <div className={`p-4 h-full flex flex-col overflow-y-auto ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
      <div className="flex items-center mb-4">
        <button className="mr-2 text-2xl" onClick={() => navigate('/')}>←</button>
        <h2 className="text-xl font-semibold">Settings</h2>
      </div>

      <h3 className="text-lg font-semibold mt-4 mb-2">Import and export</h3>
      <div className="flex items-center justify-between mb-2">
        <span>Export data</span>
        <button
          className="text-blue-500 hover:text-blue-600"
          onClick={handleExport}
          aria-label="Export data"
        >
          <ImportIcon />
        </button>
      </div>
      <div className="flex items-center justify-between mb-2">
        <span>Import data</span>
        <label className="text-blue-500 hover:text-blue-600 cursor-pointer">
          <ExportIcon />
          <input
            type="file"
            accept=".csv"
            onChange={handleImport}
            className="hidden"
            aria-label="Import data"
          />
        </label>
      </div>
      <div className="flex items-center justify-between mb-2">
        <span>Load NSE symbols</span>
        <label>
          <button className=" text-blue-500 hover:text-blue-600 cursor-pointer hover:bg-gray-200 rounded-md"
            onClick={() => {
              if (justClickedLoadNse) return;
              justClickedLoadNse = true; //using this variable instead of a debouncer

              chrome.storage.local.get("loadedNseStatus", (val) => {
                if (val.loadedNseStatus === 'true') {
                  justClickedLoadNse = false;
                  return setNotificationState({ show: true, type: 'success', text: 'NSE symbols are already loaded!', duration: 3000 })
                }
                dexieStore.loadNseSymbols().then(() => {
                  chrome.storage.local.set({ "loadedNseStatus": 'true' }, () => {
                    justClickedLoadNse = false
                    setNotificationState({ show: true, type: 'success', text: 'NSE symbols loaded!', duration: 3000 })
                  })
                })
              })
            }}>
            <Download></Download>
          </button>
        </label>
      </div>
      <div className="flex items-center justify-between">
        <span>Delete NSE symbols</span>
        <label>
          <button className="text-blue-500 hover:text-blue-600 cursor-pointer hover:bg-gray-200 rounded-md"
            onClick={() => {
              chrome.storage.local.get("loadedNseStatus", (val) => {
                if (val.loadedNseStatus == 'false') return;
                dexieStore.deleteNseSymbol().then(() => {
                  chrome.storage.local.set({ "loadedNseStatus": 'false' })
                  setNotificationState({ show: true, type: 'success', text: 'NSE symbols deleted!', duration: 3000 })
                })
              })
            }}>
            <Trash2Icon></Trash2Icon>
          </button>
        </label>
      </div>

      {importError && <p className="text-red-500 mt-2">{importError}</p>}

      <h3 className="text-lg font-semibold mt-4 mb-2">Other settings</h3>
      <div className="flex items-center justify-between mb-2">
        <span className="mr-2">{isDarkMode ? 'Dark mode' : 'Light mode'}</span>
        <label className="flex items-center cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              checked={isDarkMode}
              onChange={toggleDarkMode}
            />
            <div className={`w-14 h-7 bg-gray-300 rounded-full transition-colors ${isDarkMode ? 'bg-blue-500' : ''
              }`}>
              <div className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform duration-300 flex items-center justify-center ${isDarkMode ? 'translate-x-7' : ''
                }`}>
                {isDarkMode ? (
                  <Moon size={12} className="text-blue-500" />
                ) : (
                  <Sun size={12} className="text-yellow-500" />
                )}
              </div>
            </div>
          </div>
        </label>
      </div>

      <div className={`w-full ${isDarkMode ? "bg-gray-800 text-white" : "bg-white text-black"}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`mr-2 ${isDarkMode ? "text-white" : "text-black"}`}>Block for this site</span>
          <label className="flex items-center cursor-pointer">
            <button
              className={`text-red-600 hover:text-red-700 ${isDarkMode ? "text-gray-400" : "text-black"}`}
              onClick={() => {

                chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
                  chrome.storage.local.get(["blockedSites"]).then((val) => {
                    if (!tabs[0].url || val.blockedSites?.includes(tabs[0].url.match(/^(?:https?:\/\/)?([^?#]+)/)[1])) return;
                    if (val.blockedSites) {
                      chrome.storage.local.set({ blockedSites: [...val.blockedSites, tabs[0].url.match(/^(?:https?:\/\/)?([^?#]+)/)[1]] })
                    } else {
                      chrome.storage.local.set({ blockedSites: [tabs[0].url] })
                    }
                    setBlockedSitesDisplay((p) => [...p, tabs[0].url.match(/^(?:https?:\/\/)?([^?#]+)/)[1]])
                  })
                })

              }}
            >
              <DotSquareIcon size={24} />
            </button>
          </label>
        </div>

        <div>
          {blockedSitesDisplay.map((url) => (
            <div key={url} className={`flex flex-row justify-between items-center mb-2 p-2 rounded-md ${isDarkMode ? "bg-gray-700" : "bg-gray-200"}`}>
              <span title={url} className={`w-40 underline cursor-pointer whitespace-nowrap text-ellipsis overflow-hidden hover:text-blue-400 ${isDarkMode ? "text-blue-300" : "text-blue-800"}`}><a href={'https://' + url} target='_blank'>{url}</a></span>
              <button
                className={`hover:text-red-500 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                onClick={() => {
                  const updatedSiteList = blockedSitesDisplay.filter((storedUrl) => url !== storedUrl)
                  chrome.storage.local.set({ blockedSites: updatedSiteList })
                  setBlockedSitesDisplay(updatedSiteList)
                }}
              >
                <Trash2 size={19} />
              </button>
            </div>
          ))}
        </div>
      </div>


      <div className={`w-full mt-3 ${isDarkMode ? "bg-gray-800 text-white" : "bg-white text-black"}`}>

        <h3 id='sheetSettings' className={`text-lg font-semibold mb-2 ${isDarkMode ? "text-white" : "text-black"}`}>
          Sheet Settings
        </h3>


        {userCreds.sheetId ? <div className={`flex flex-row justify-between mb-3 items-center p-2 rounded-md ${isDarkMode ? "bg-gray-600" : "bg-gray-200"}`}>
          <span>
            <a className={`underline font-semibold text-sm ${isDarkMode ? "text-[#00a884] hover:text-[#009172]" : "text-green-700 hover:text-blue-500"}`}
              href={`https://docs.google.com/spreadsheets/d/${userCreds.sheetId}`}
              target="_blank"
              rel="noopener noreferrer">
              Current-Sheet
            </a>
          </span>
          <button className={`hover:text-red-500 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
            onClick={() => {
              chrome.storage.local.remove("userCreds").then(() => {
                setUserCreds({})
              })
            }}>
            <Trash2 size={20} />
          </button>
        </div>

          : <div className={`flex flex-col items-center p-3 mb-3 rounded-md ${isDarkMode ? "bg-[#2a3942]" : "bg-gray-100"}`}>

            <button
              className={`w-full py-2 rounded-md font-medium transition duration-200 ${isDarkMode
                ? "bg-[#007c65] hover:bg-[#00a884] text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              onClick={() => generateSheetUrl()}
            >
              Create New
            </button>

            <span title='If you have an existing sheet that was registered earlier, you can continue with it from below' className="my-1 flex flex-row items-center text-sm text-gray-500">or <i><AlertCircle size={11} className='ml-1'></AlertCircle></i></span>

            <div className="flex flex-row w-full gap-1">
              <input
                type="text"
                value={sheetUrlInput}
                onChange={(e) => setSheetUrlInput(e.target.value)}
                placeholder="Enter existing sheet URL"
                className={`flex-1 px-3 py-2 rounded-md focus:outline-none focus:ring-2 transition duration-200 ${isDarkMode
                  ? "bg-gray-600 text-white border-none focus:ring-[#00a884] placeholder-gray-300"
                  : "bg-white text-black border border-gray-300 focus:ring-blue-500 placeholder-gray-500"
                  }`}
              />

              <button
                className={`px-2 py-2 rounded-md font-medium transition duration-200 ${isDarkMode
                  ? "bg-[#007c65] hover:bg-[#00a884] text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                onClick={() => registerSheetUrl()}
              >
                Register
              </button>
            </div>

          </div>
        }




        <div className='flex flex-row justify-between items-center mb-3'>
          <span className='flex flex-row' title='Loads un-synced data to sheet'>Backup Un-synced data to sheet</span>
          <button className={`px-2 py-1 rounded-md font-medium ${isDarkMode
            ? "bg-[#007c65] hover:bg-[#00a884] text-white"
            : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
            onClick={async () => {
              setLoadingScreenState({ show: true })

              await loadUnsynced().then((res1) => {
                if (!res1 || res1 == 'networkError') {
                  setNotificationState({ show: true, type: 'failure', text: "something went wrong while backing up \n- your connection is poor OR your sheet is not registered!" })
                  return
                }

                deleteUnsynced().then((res2) => {
                  if (!res2 || res2 == 'networkError') {
                    setNotificationState({ show: true, type: 'failure', text: "something went wrong while backing up \n- your connection is poor OR your sheet is not registered!" })
                    return
                  }
                  setLoadingScreenState({ show: false })
                  setNotificationState({ show: true, type: 'success', text: 'Synced data successfully!', duration: 3000 })
                })
              }).catch(err => console.log(err))


            }}>{<RefreshCcwIcon size={18}></RefreshCcwIcon>}</button>
        </div>

        <div className='flex flex-row justify-between items-center'>
          <span className='flex flex-row items-center' title='Loads un-synced data to sheet'>Load data from sheet to local <i title='Over-writes all your local notes data with the data present in sheet'><AlertCircle size={13} className='ml-1'></AlertCircle></i></span>
          <button className={`px-2 py-1 rounded-md font-medium ${isDarkMode
            ? "bg-[#007c65] hover:bg-[#00a884] text-white"
            : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
            onClick={async () => {
              setLoadingScreenState({ show: true })
              await dexieStore.populateLocal().then((res) => {
                res ? setNotificationState({ show: true, type: 'success', text: 'Loaded data successfully!', duration: 3000 }) : setNotificationState({ show: true, type: 'failure', text: "something went wrong while restoring data, \n- your connection is poor OR your sheet is not registered!" })
              })
              setLoadingScreenState({ show: false })
            }}>{<DownloadCloudIcon size={18}></DownloadCloudIcon>}</button>
        </div>
      </div>

    </div>
  );
};

export default Settings;