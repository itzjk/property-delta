Output docs/demo.gif
Set Shell "bash"
Set FontSize 17
Set Width 1240
Set Height 1200
Set Padding 20
Set Framerate 5
Set TypingSpeed 12ms
Set Theme "Catppuccin Mocha"
Require property-delta
Hide
Type "export PS1='$ '; clear"
Enter
Sleep 500ms
Show
Type "property-delta examples/before.css examples/after.css"
Enter
Wait+Screen@30s /Review gate: not triggered; exit 0/
Sleep 9s
Type "clear"
Enter
Type "property-delta examples/after.css examples/reformatted.css"
Enter
Wait+Screen@30s /Review gate: not triggered; exit 0/
Sleep 8s
