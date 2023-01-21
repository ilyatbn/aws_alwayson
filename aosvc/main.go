package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"sync"
	"gopkg.in/ini.v1"
	"github.com/judwhite/go-svc"
)

type settings struct {
	os string
	svc bool
	username string
	logpath string
}

type program struct {
	wg   sync.WaitGroup
	quit chan struct{}
	settings settings
	webserver *http.Server
}

type Credentials struct {
    AccessKeyId string
	SecretAccessKey string
	SessionToken string
	Expiration string
}

func main() {
	prg := &program{}
	if err := svc.Run(prg); err != nil {
		log.Fatal(err)
	}
}

func (p *program) Init(env svc.Environment) error {
	current_settings := settings{}
	current_settings.os = runtime.GOOS
	if current_settings.os == "windows" {
		if env.IsWindowsService() {
			current_settings.svc=true
			current_settings.logpath="c:/programdata/awsao"
			_ = os.MkdirAll(current_settings.logpath, os.ModePerm)
		} else {
			path, _ := os.Getwd()
			current_settings.svc=false
			current_settings.logpath=path
		}
		} else {
			current_settings.logpath="/var/log" 
		}
	file, err := os.OpenFile(current_settings.logpath+"/awsao.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0666)
	if err != nil {
		log.Fatal(err)
	}
	multi := io.MultiWriter(file, os.Stdout)
	log.SetOutput(multi)
	p.settings = current_settings
	return nil
}

func (p *program) getLogin() (string, error) {
	//Checks username of the browser establishing the connection to the browser
	var err error
	var out []byte
	// if 2 browsers running the extension from 2 different users logged on to the system the service won't know
	// which user's credentials file needs to be updated, so we do this the hacky way.
	// Check the currently established connections to our service, hopefully should only have one. 
	// then we get the PID of the process establishing the connection and from there the username running it.
	if p.settings.os=="windows"{
		cmd := `(Get-NetTCPConnection | Where-Object State -eq Established | Where-Object LocalAddress -eq 127.0.0.1 | Where-Object RemotePort -eq 31339 | select OwningProcess).OwningProcess | ForEach-Object -Process {(Get-WmiObject Win32_Process -Filter "ProcessId=$_" | Select @{Name="UserName";Expression={$_.GetOwner().User}}).UserName}`
		out, _ = exec.Command("powershell", cmd).Output()
		p.settings.username=strings.TrimSuffix(string(out),"\r\n")
	} else {
		// Linux
		getnet := fmt.Sprintf("$(netstat -np | grep 31339 | grep ESTABLISHED |grep -v %v| awk '{print $7}' | awk -F'/' '{print $1}')", os.Getpid())
		cmd := fmt.Sprintf("if [[ ! -z %v ]]; then ps -up %v | awk '{print $1}' | grep -v USER;fi;", getnet, getnet)
		out, err = exec.Command("bash","-c", cmd).Output()
		p.settings.username=strings.TrimSuffix(string(out), "\n")
	}
	if err != nil {
		log.Printf("execution error:%v\n", err)
		return "", err
	}
	return p.settings.username, nil
}

func (p *program) updateCredFile(creds Credentials) error {
	// var cfg *ini.File
	user,err := p.getLogin()
	if err != nil {
		log.Printf("could not get username from user:%v", err)
		return err
	}
	var filePath string
	if p.settings.os=="windows" {
		//we only need the drive name which should be the same as there all the rest of the users are.
		dirname, _ := os.UserHomeDir() 
		filePath = fmt.Sprintf("%v/users/%v/.aws", dirname[0:2], user)
	} else {
		filePath = fmt.Sprintf("/home/%v/.aws", user)
	}
	log.Printf("path:%v", filePath)
	cfg, err := ini.Load(filePath+"/credentials")
    if err != nil {
		log.Printf("failed to read file: %v", err)
		cfg = ini.Empty()
		_ = os.MkdirAll(filePath, os.ModePerm)
    }
	
	cfg.DeleteSection("default")
	cfg.NewSection("default")
	cfg.Section("default").Key("aws_access_key_id").SetValue(creds.AccessKeyId)
	cfg.Section("default").Key("aws_secret_access_key").SetValue(creds.SecretAccessKey)
	cfg.Section("default").Key("aws_session_token").SetValue(creds.SessionToken)
	cfg.Section("default").Key("aws_session_expiration").SetValue(creds.Expiration)
	cfg.SaveTo(filePath+"/credentials")
	log.Printf("updated %v/credentials file", filePath)
	return nil
}

func (p *program) processUpdate(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("could not read body: %s\n", err)
	}
	creds := Credentials{}
    json.Unmarshal([]byte(body), &creds)
	err = p.updateCredFile(creds)
	var response string
	if err != nil {
		response = fmt.Sprintf("could not update file: %v", err)
	} else {
		response = "ok"
	}
	w.Header().Set("Connection", "close")
	io.WriteString(w, response)
}

func (p *program) initWebServer(server *http.Server) error {
	err := server.ListenAndServe()
	if errors.Is(err, http.ErrServerClosed) {
		log.Printf("web server stopped.\n")
		} else if err != nil {
			log.Printf("error starting server: %s\n", err)			
		}
	<-p.quit
	p.wg.Done()
	return nil
}

func (p *program) Start() error {
	// The Start method must not block, or Windows may assume your service failed
	// to start. Launch a Goroutine here to do something interesting/blocking.
	p.quit = make(chan struct{})
	p.wg.Add(1)
	mux := http.NewServeMux()
	mux.HandleFunc("/update", p.processUpdate)
	log.Printf("starting web server")
	p.webserver = &http.Server{Addr: "127.0.0.1:31339", Handler: mux}
	go p.initWebServer(p.webserver)
	return nil
}

func (p *program) Stop() error {
	log.Println("aws alwayson client service stopping..")
	p.webserver.Shutdown(context.Background())
	close(p.quit)
	p.wg.Wait()
	return nil
}