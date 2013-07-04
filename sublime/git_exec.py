import sublime, sublime_plugin
import subprocess
import os
import time
import thread
from utils import read_config, MODULES_CONFIG

class GitExecCommand(sublime_plugin.WindowCommand):

  def get_subdirs(self, folder):
    dirs = [os.path.join(folder, name) for name in os.listdir(folder) if os.path.isdir(os.path.join(folder, name))]
    dirs.insert(0, folder);
    return dirs

  def append_data(self, str):

      # Normalize newlines, Sublime Text always uses a single \n separator
      # in memory.
      str = str.replace('\r\n', '\n').replace('\r', '\n')

      selection_was_at_end = (len(self.output_view.sel()) == 1
          and self.output_view.sel()[0]
              == sublime.Region(self.output_view.size()))
      self.output_view.set_read_only(False)
      edit = self.output_view.begin_edit()
      self.output_view.insert(edit, self.output_view.size(), str)
      if selection_was_at_end:
          self.output_view.show(self.output_view.size())
      self.output_view.end_edit(edit)
      self.output_view.set_read_only(True)


  def process_folder(self, folder):
    self.append_data("Processing %s...\n"%folder)
    p = subprocess.Popen(self.cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=folder)
    out, err = p.communicate()
    self.append_data(out)
    print(out)
    print(err)
      
  def process_top_folder(self, folder):
    self.append_data("Starting %s...\n"%(" ".join(self.cmd)))
    config = read_config(os.path.join(folder, MODULES_CONFIG))
    for m in config.modules:
      module_dir = os.path.join(folder, m.folder)
      self.process_folder(module_dir)

    self.append_data("done.\n")
  
  def run(self, cmd=None):
    if cmd == None:
      return

    self.cmd = cmd
    self.output_view = self.window.get_output_panel("git_exec");
    self.window.run_command("show_panel", {"panel": "output.git_exec"})

    for folder in self.window.folders():
      thread.start_new_thread(self.process_top_folder, tuple([folder]))
