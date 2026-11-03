"""Compatibility entry point: existing Render services now launch the Node backend."""
import os
os.execvp("node", ["node", "app-server/node.mjs"])
