/* eslint-disable class-methods-use-this, consistent-return */
const chalk = require('chalk');
const del = require('del');
const fs = require('fs');
const path = require('path');

import axios from 'axios';
import Generator from 'yeoman-generator';
import kebabcase from 'dashify';
import Remote from '../_utils/Remote';

/**
 * Main generator.
 *
 * @export
 * @class BootstrapApp
 * @extends {Generator}
 */
export default class BootstrapApp extends Generator {
  /**
   * Creates an instance of BootstrapApp.
   * @param {Object} args options
   * @param {Object} opts arguments
   *
   * @memberof EpicApp
   */
  constructor(args, opts) {
    // Avoid confirm message for delete/overwrite files
    opts.force = true;

    super(args, opts);

    this.option('test', {
      type: String,
      required: false,
      desc: 'Test mode',
    });

    this.option('dev', {
      type: String,
      required: false,
      desc: 'Dev mode',
    });

    this.props = {};
  }

  get initializing() {
    return {
      /**
       * Start yo timer.
       * @returns {undefined}
       */
      start() {
        console.time('yo');
      },

      /**
       * Log options infos.
       * @returns {undefined}
       */
      checkOptions() {
        if (this.options.test) {
          this.log(chalk.cyan('> Mode test [ON]'));
        }

        if (this.options.dev) {
          this.log(chalk.cyan('> Mode dev [ON]'));
        }
      },
    };
  }

  get prompting() {
    return {
      askForProjectName() {
        this.props.project = {};

        const prompts = [
          {
            name: 'projectName',
            message: 'Project name: ',
            default: '',
          },
        ];

        return this
          .prompt(prompts)
          .then(answers => {
            this.props.project.name = answers.projectName;
            this.props.project.dir = kebabcase(answers.projectName);
          });
      },

      askForSchoolYear() {
        const prompts = [{
          name: 'schoolYear',
          type: 'list',
          message: 'In which year of study',
          choices: [
            {
              name: 'B2G*',
              value: 2,
            },
            {
              name: 'B3G*',
              value: 3,
            },
          ],
        }];

        return this
          .prompt(prompts)
          .then(answers => {
            switch (answers.schoolYear) {
              case 2:
              default:
                this.props.project.workflow = 'laravel-mix-minimal';
                break;
              case 3:
                this.props.project.workflow = 'laravel-mix';
                break;
            }
          });
      },

      askForRepo() {
        if (process.env.DWMAJ_GH_TOKEN) {
          const prompts = [
            {
              name: 'createRepo',
              type: 'confirm',
              message: 'Create a repo on Github?',
              default: false,
            },
          ];

          return this
            .prompt(prompts)
            .then(answers => {
              this.props.createRepo = answers.createRepo;
            });
        }
      },
    };
  }

  get configuring() {
    return {
      dir() {
        // Create project directory
        const dest = this.props.project.dir;

        if (fs.existsSync(dest)) {
          this.env.error(`
> ${chalk.red(`Ooops! Non-empty directory! [${process.cwd()}/${dest}]`)}
> ${chalk.red('I don\'t want to erase your stuff… 😅')}
> ${chalk.red('Retry with another name/location')}
          `);
        } else {
          fs.mkdirSync(dest);
        }
      },
    };
  }

  get writing() {
    return {
      files() {
        const done = this.async();
        const dest = this.props.project.dir;
        const branch = this.props.project.workflow;

        // eslint-disable-next-line no-new
        new Remote('workflow', branch, (err, cache) => {
          this.cache = cache;

          // Copy folders
          this.fs.copy(
            `${cache}/**/*`,
            this.destinationPath(`${dest}/`)
          );

          done();
        });
      },

      repo() {
        if (this.props.createRepo) {
          const done = this.async();
          const name = this.props.project.dir;
          const description = this.props.project.name;
          const dest = name;

          axios({
            method: 'post',
            url: 'https://api.github.com/user/repos',
            headers: {
              Accept: 'application/vnd.github.v3+json',
              Authorization: `token ${process.env.DWMAJ_GH_TOKEN}`,
            },
            data: {
              name,
              description,
              private: false,
            },
          })
            .then(res => {
              if (res.status === 201) {
                this.log(`> ${chalk.cyan('🐙 Creating repo')}`);

                return res.data.ssh_url;
              }
            })
            .catch(err => {
              let msg;

              if (err.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                msg = err.response.status;
              } else if (err.request) {
                // The request was made but no response was received
                // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                // http.ClientRequest in node.js
                msg = err.request;
              } else {
                // Something happened in setting up the request that triggered an Error
                msg = err.message;
              }
              this.log(`> ${chalk.red(`🐙 An error append during repo creation [${msg}]`)}`);
              done();
            })
            .then(url => {
              this.log(`> ${chalk.cyan(`⚡️ Initializing git [${url}]`)}`);
              // eslint-disable-next-line global-require
              const simpleGit = require('simple-git/promise')(path.join(process.cwd(), dest));

              return simpleGit
                .init()
                .then(() => simpleGit.addRemote('origin', url))
                .then(done)
                .catch(err => {
                  this.log(`> ${chalk.red(`🐙 An error append during git initialization [${err.message}]`)}`);
                  done();
                });
            });
        }
      },
    };
  }

  install() {
    const dest = this.props.project.dir;

    process.chdir(path.join(process.cwd(), dest));
    this.log(`> ${chalk.cyan('📦 Installing dependencies with `npm i`')}`);
    this.npmInstall();
  }

  get end() {
    return {
      clean() {
        // DEV
        // this.log(`> ${chalk.cyan(`🗑  Cache deleted: ${this.cache}`)}`);
        this.log(`> ${chalk.cyan('🗑  Deleting cache')}`);

        return del(this.cache, { force: true });
      },

      bye() {
        this.log(`> ${chalk.cyan('🚀 Almost done! Copy-paste next line and happy coding!')}`);
        this.log(chalk.green(`cd ${this.props.project.dir} && npm start`));
        console.timeEnd('yo');
      },
    };
  }
}
