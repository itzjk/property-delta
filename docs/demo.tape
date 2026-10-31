Output docs/demo.gif
Set Shell "bash"
Set FontSize 17
Set Width 1240
Set Height 1200
Set Padding 20
Set Framerate 5
Set TypingSpeed 12ms
Set Theme "Catppuccin Mocha"
Require node
Hide
Type "export PS1='$ '; clear"
Enter
Sleep 500ms
Type "node bin/property-delta.mjs examples/before.css examples/after.css --fail-on-change"
Enter
Wait+Screen@30s /Review gate: triggered; exit 1/
Sleep 500ms
Show
Sleep 9s
Type "clear"
Enter
Type "node bin/property-delta.mjs examples/after.css examples/reformatted.css --fail-on-change"
Enter
Wait+Screen@30s /Review gate: not triggered; exit 0/
Sleep 8s
