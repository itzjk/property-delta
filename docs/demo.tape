Output docs/demo.gif
Set Shell "bash"
Set FontSize 17
Set Width 1240
Set Height 1200
Set Padding 20
Set TypingSpeed 12ms
Set Theme "Catppuccin Mocha"
Hide
Type "export PS1='$ '; clear"
Enter
Sleep 500ms
Show
Type "node bin/property-delta.mjs examples/before.css examples/after.css"
Enter
Sleep 9s
Type "clear"
Enter
Type "node bin/property-delta.mjs examples/after.css examples/reformatted.css"
Enter
Sleep 8s
