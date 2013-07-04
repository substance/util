import sublime, sublime_plugin
import subprocess
import os
import time
import re
from utils import read_config, MODULES_CONFIG

def NamedGroup(key, s):
  return "(?P<"+key+">"+s+")"

GIT_STATUS_RE_STR = "^" + NamedGroup("theirs", ".") + NamedGroup("mine", ".") + " " + NamedGroup("file1", ".*?") + "( -> " + NamedGroup("file2", ".*?") + ")?$"
GIT_STATUS_RE = re.compile(GIT_STATUS_RE_STR)

class GitStatusCommand(sublime_plugin.WindowCommand):

  INSTANCE = None
  NAME = ".Git.Status"

  def __init__(self, window):
    self.window = window
    self.line2entry = []
    self.view = None
    GitStatusCommand.INSTANCE = self

  def get_subdirs(self, folder):
    dirs = [os.path.join(folder, name) for name in os.listdir(folder) if os.path.isdir(os.path.join(folder, name))]
    dirs.insert(0, folder);
    return dirs

  def process_folder(self, folder):
    cmd = ["git", "status", "--porcelain"]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, cwd=folder)
    out, err = p.communicate()
    entries = []
    for line in out.split("\n"):
      match = GIT_STATUS_RE.match(line)
      if match:
        d = dict(match.groupdict())
        d["line"] = line
        entries.append(d)

    if len(entries) == 0:
      return None
    else:
      return [folder, entries]

  def process_top_folder(self, folder):
    result = []
    config = read_config(os.path.join(folder, MODULES_CONFIG))
    for m in config.modules:
      module_dir = os.path.join(folder, m.folder)
      item = self.process_folder(module_dir)
      if not item == None:
        result.append(item)

    return dict(result)

  def update(self, view):

    for folder in self.window.folders():
      changes = self.process_top_folder(folder)

    # begin edit for adding content
    view.set_read_only(False)
    edit = view.begin_edit()

    # erase existent content
    all = sublime.Region(0, view.size()+1)
    view.erase(edit, all)

    pos = view.sel()[0]
    self.line2entry = []
    for folder, items in changes.items():
      entry = {"folder": folder}
      view.insert(edit, view.size(), "Repository %s:\n"%(folder))
      self.line2entry.append(entry)
      
      view.insert(edit, view.size(), "\n")
      self.line2entry.append(entry)

      for item in items:
        view.insert(edit, view.size(), "%s\n"%(str(item["line"])))
        self.line2entry.append(entry)

      view.insert(edit, view.size(), "\n")
      self.line2entry.append(entry)

    self.line2entry.append(entry)

    view.end_edit(edit)
    
    # freeze the file
    view.set_read_only(True)
    view.set_scratch(True)

    self.view = view

  def run(self):
    window = self.window

    views = filter(lambda x: x.name() == GitStatusCommand.NAME, window.views())
    if len(views) == 0:
      status_view = window.new_file()
      status_view.set_name(GitStatusCommand.NAME)
    else:
      status_view = views[0]

    status_view.settings().set('command_mode', True)
    self.view = status_view
    
    self.update(status_view)

class GitCommitCommand(sublime_plugin.TextCommand):

  def run(self, edit):
    r = self.view.sel()[0]
    row = self.view.rowcol(r.begin())[0];
    folder = GitStatusCommand.INSTANCE.line2entry[row]["folder"]
    p = subprocess.Popen(["git", "gui"], cwd=folder)

class GitCommitListener(sublime_plugin.EventListener):
  def on_activated(self, view):
    if GitStatusCommand.NAME == view.name():
      GitStatusCommand.INSTANCE.update(view)
    
  def on_query_context(self, view, key, value, operand, match_all):
    if GitStatusCommand.NAME == view.name() and key == "git_status":
      return True
    return None
