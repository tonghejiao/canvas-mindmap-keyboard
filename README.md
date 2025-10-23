# canvas mindmap keyboard
## Introduce
The purpose is to create a canvas-based mind map plug-in that can be operated by keyboard as much as possible.
## Development background
Thank you for this warehouse: [https://github.com/Quorafind/Obsidian-Canvas-MindMap](https://github.com/Quorafind/Obsidian-Canvas-MindMap)

To be honest, if the author of this warehouse hadn't updated the plug-in for 1 year, I wouldn't have been too lazy to develop this plug-in.

## Contact me

WeChat: smallconantong

## Feature
| Name                                                         | Introduce                                                    | Use the premise                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| The plug-in takes effect according to the file name.         | In order to avoid functions such as automatic layout affecting the existing canvas file, it will only take effect when the canvas file name contains the `mindmap` string, which can be modified in the settings. |                                                              |
| Create a root node                                           | Press the `enter` key                                        | When no node is selected<br />The file name contains the `mindmap` string |
| Create sub-nodes                                             | Press the `tab` key                                          | When only one node is selected<br />The file name contains the `mindmap` string |
| Create a brother node                                        | Press the `enter` key                                        | When only one node is selected<br />The file name contains the `mindmap` string |
| Delete nodes and subtrees                                    | Press the `backspace` key                                    | When only one node is selected<br />The file name contains the `mindmap` string |
| Move the focus node(free mode)                               | Press the `i/j/k/l` key<br />You can modify it in the settings. | When only one node is selected<br />The file name contains the `mindmap` string |
| Move the focus node until end (free mode)                    | Press the `Shift + i/j/k/l` key<br />You can modify it in the settings. | <br />The file name contains the `mindmap` string            |
| Move the focus node(Normal mode)                             | macos: Press the `Ctrl + i/j/k/l` key<br />otheros: Press the `Alt + i/j/k/l` key<br />You can modify it in the settings. | When only one node is selected<br />The file name contains the `mindmap` string |
| Move the focus node until end(Normal mode)                   | macos: Press the `Ctrl + Shift + i/j/k/l` key<br />otheros: Press the `Alt + Shift + i/j/k/l` key<br />You can modify it in the settings. | <br />The file name contains the `mindmap` string            |
| The node enters the editing state                            | Press the `space` bar                                        | When only one node is selected<br />The file name contains the `mindmap` string |
| Select the node closest to the center of the view            | Press the `space` bar                                        | When not a single node is selected<br />The file name contains the `mindmap` string |
| Automatically adjust the height of the node                  |                                                              | When the node exits the editing state<br />The file name contains the `mindmap` string |
| Automatic layout                                             | There are three levels of automatic layout: <br />- automatic layout of the entire canvas, <br />- automatic layout in the tree, <br />- and non-automatic layout.<br /> You can also set the automatic layout for the canvas separately. You only need to add keywords to the file name (check in the settings) | When creating and deleting nodes<br />The file name contains the `mindmap` string |
| Manually adjust the height of all nodes in canvas            | Command: global resize                                       |                                                              |
| Manually adjust the layout of the whole canvas               | Command: global relayout                                     |                                                              |
| Manually adjust the height and layout of all nodes           | Command: global resize and relayout                          |                                                              |
| Adjust the layout of the tree where the selected node is located | Command: relayout selected tree                              |                                                              |

## Notes

- The name of the modified key: Ctrl Shift Alt Mod (mod is cmd in macos, and ctrl in other systems)
- Special key name: ArrowUp ArrowDown ArrowLeft ArrowRight
- Using Alt as a modifier key often fails in macos. The reason may be that alt+ characters in the input method will be converted into special characters, so it is not recommended to use shortcuts with alt in macos.
- This plug-in judges the parent-child relationship through the primary color connection between nodes. If a node has two parent nodes, some accidents may occur in the layout. Please let one node have only one father, if there must be more than one. Please use colored wires to connect.

## Buy me a coffee
### ko-fi
[<img src="https://storage.ko-fi.com/cdn/logomarkLogo.png" width="100">](https://ko-fi.com/conantong02)
### wechat
<img width="400" height="380" alt="mm_reward_qrcode_1760682528374(1)" src="https://github.com/user-attachments/assets/111ad665-4a24-4b29-8ee4-b704ff06e409" />

