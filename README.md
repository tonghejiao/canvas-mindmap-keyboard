# canvas mindmap keyboard
## Introduce
The purpose is to create a canvas-based mind map plug-in that can be operated by keyboard as much as possible.
## Development background
Thank you for this warehouse: [https://github.com/Quorafind/Obsidian-Canvas-MindMap](https://github.com/Quorafind/Obsidian-Canvas-MindMap)

To be honest, if the author of this warehouse hadn't updated the plug-in for 1 year, I wouldn't have been too lazy to develop this plug-in.

## feature
| Name                                                 | Introduce                                                    | Use the premise                       |
| ---------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------- |
| Create a root node                                   | Press the `enter` key                                        | When no node is selected              |
| Create sub-nodes                                     | Press the `tab` key                                          | When only one node is selected        |
| Create a brother node                                | Press the `enter` key                                        | When only one node is selected        |
| Delete nodes and subtrees                            | Press the `delete` key or `backspace` key                    | When only one node is selected        |
| Move the focus node(free mode)                       | Press the `i/j/k/l` key<br />You can modify it in the settings. | When only one node is selected        |
| Move the focus node until end (free mode)            | Press the `Shift + i/j/k/l` key<br />You can modify it in the settings. |                                       |
| Move the focus node(Normal mode)                     | macos: Press the `Ctrl + i/j/k/l` key<br />otheros: Press the `Alt + i/j/k/l` key<br />You can modify it in the settings. | When only one node is selected        |
| Move the focus node until end(Normal mode)           | macos: Press the `Ctrl + Shift + i/j/k/l` key<br />otheros: Press the `Alt + Shift + i/j/k/l` key<br />You can modify it in the settings. |                                       |
| The node enters the editing state                    | Press the `space` bar                                        | When only one node is selected        |
| Automatically adjust the height of the node          |                                                              | When the node exits the editing state |
| Automatic layout                                     |                                                              | When creating and deleting nodes      |
| The plug-in takes effect according to the file name. | In order to avoid functions such as automatic layout affecting the existing canvas file, it will only take effect when the canvas file name contains the `mindmap` string, which can be modified in the settings. |                                       |

